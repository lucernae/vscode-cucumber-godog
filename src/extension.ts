// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

// Feature and Scenario pattern detection
const FEATURE_PATTERN = /^\s*(Feature:)\s*(.*)$/;
const SCENARIO_PATTERN = /^\s*(Scenario:)\s*(.*)$/;
const SCENARIO_OUTLINE_PATTERN = /^\s*(Scenario Outline:)\s*(.*)$/;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

 	// Register the run feature command
	const runFeatureDisposable = vscode.commands.registerCommand('cucumber-godog.runFeature', async (featureName?: string, filePath?: string) => {
		// If featureName and filePath are provided, run the test directly
		if (featureName && filePath) {
			runTest(filePath, featureName);
			return;
		}

		// Otherwise, find all feature files and let the user select one
		const featureFiles = await findFeatureFiles();
		if (!featureFiles || featureFiles.length === 0) {
			vscode.window.showInformationMessage('No feature files found in the project.');
			return;
		}

		// Extract feature names from the files
		const features = await extractFeatures(featureFiles);
		if (!features || features.length === 0) {
			vscode.window.showInformationMessage('No features found in the project.');
			return;
		}

		// Show quick pick to select a feature
		const selectedFeature = await vscode.window.showQuickPick(
			features.map(f => ({ 
				label: f.name,
				description: path.basename(f.filePath),
				detail: f.filePath
			})),
			{ placeHolder: 'Select a feature to run' }
		);

		if (selectedFeature) {
			runTest(selectedFeature.detail, selectedFeature.label);
		}
	});

	// Register the run scenario command
	const runScenarioDisposable = vscode.commands.registerCommand('cucumber-godog.runScenario', async (featureName?: string, scenarioName?: string, filePath?: string) => {
		// If featureName and filePath are provided, run the test directly
		if (featureName && scenarioName && filePath) {
			runTest(filePath, featureName, scenarioName);
			return;
		}

		// Otherwise, find all feature files and let the user select one
		const [featureFiles] = await Promise.all([findFeatureFiles()]);
		if (!featureFiles || featureFiles.length === 0) {
			vscode.window.showInformationMessage('No feature files found in the project.');
			return;
		}

		// Extract feature names from the files
		const [features] = await Promise.all([extractFeatures(featureFiles)]);
		if (!features || features.length === 0) {
			vscode.window.showInformationMessage('No features found in the project.');
			return;
		}

		// Show quick pick to select a feature
		const selectedFeature = await vscode.window.showQuickPick(
			features.map(f => ({
				label: f.name,
				description: path.basename(f.filePath),
				scenarioNames: f.scenarioNames,
				detail: f.filePath
			})),
			{ placeHolder: 'Select a feature to run' }
		);

		if (!selectedFeature) {
			vscode.window.showInformationMessage('No feature selected. Please select a feature to run a scenario.');
			return
		}

		const selectedScenario = await vscode.window.showQuickPick(
			selectedFeature.scenarioNames.map(s => ({ label: s})),
			{ placeHolder: 'Select a scenario to run' }
		);

		if (selectedScenario) {
			runTest(selectedFeature.detail, selectedFeature.label, selectedScenario.label);
		}
	});

	// Register the code lens provider
	const codeLensProvider = new CucumberCodeLensProvider();
	const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
		{ language: 'feature' },
		codeLensProvider
	);

	// Add all disposables to the context subscriptions
	context.subscriptions.push(
		runFeatureDisposable,
		runScenarioDisposable,
		codeLensProviderDisposable
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Interface for feature information
interface FeatureInfo {
	name: string;
	scenarioNames: string[];
	filePath: string;
}

// Function to find all feature files in the workspace
async function findFeatureFiles(): Promise<string[]> {
	const featureFiles: string[] = [];

	// Get all workspace folders
	if (!vscode.workspace.workspaceFolders) {
		return featureFiles;
	}

	// Search for all .feature files in the workspace
	const featureFilesUris = await vscode.workspace.findFiles('**/*.feature', '**/node_modules/**');

	// Convert URIs to file paths
	for (const uri of featureFilesUris) {
		featureFiles.push(uri.fsPath);
	}

	return featureFiles;
}

// Function to extract feature names from feature files
async function extractFeatures(featureFiles: string[]): Promise<FeatureInfo[]> {
	const features: FeatureInfo[] = [];

	for (const filePath of featureFiles) {
		try {
			// Read the file content
			const document = await vscode.workspace.openTextDocument(filePath);
			const text = document.getText();

			// Find the feature name using the regex pattern
			const lines = text.split('\n');
			let currentFeature: FeatureInfo | undefined;
			for (const line of lines) {
				const featureMatch = line.match(FEATURE_PATTERN);
				if (featureMatch) {
					const featureName = featureMatch[2].trim();
					currentFeature = {
						name: featureName,
						scenarioNames: [],
						filePath: filePath
					}
					features.push(currentFeature);
					continue;
				}
				const scenarioMatch = line.match(SCENARIO_PATTERN) || line.match(SCENARIO_OUTLINE_PATTERN);
				if (scenarioMatch) {
					const scenarioName = scenarioMatch[2].trim();
					currentFeature?.scenarioNames.push(scenarioName);
				}
			}
		} catch (error) {
			console.error(`Error reading feature file ${filePath}:`, error);
		}
	}

	return features;
}

// Code lens provider for Cucumber feature files
class CucumberCodeLensProvider implements vscode.CodeLensProvider {
	public provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];
		const filePath = document.uri.fsPath;

		// Process each line in the document
		let currentFeatureName: string | undefined;
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			const text = line.text;

			// Check for Feature
			const featureMatch = text.match(FEATURE_PATTERN);
			if (featureMatch) {
				const featureName = featureMatch[2].trim();
				const range = new vscode.Range(i, 0, i, text.length);
				const runFeatureCommand = {
					title: '▶ Run Feature',
					command: 'cucumber-godog.runFeature',
					arguments: [featureName, filePath]
				};
				currentFeatureName = featureName;
				codeLenses.push(new vscode.CodeLens(range, runFeatureCommand));
				continue;
			}

			// Check for Scenario or Scenario Outline
			const scenarioMatch = text.match(SCENARIO_PATTERN) || text.match(SCENARIO_OUTLINE_PATTERN);
			if (scenarioMatch) {
				const scenarioName = scenarioMatch[2].trim();
				const range = new vscode.Range(i, 0, i, text.length);
				const runScenarioCommand = {
					title: '▶ Run Scenario',
					command: 'cucumber-godog.runScenario',
					arguments: [currentFeatureName, scenarioName, filePath]
				};
				codeLenses.push(new vscode.CodeLens(range, runScenarioCommand));
			}
		}

		return codeLenses;
	}
}

function sanitizeName(name: string) {
	return name.replace(/[^a-zA-Z0-9]/g, '_');
}

// Function to run the test with godog
function runTest(filePath: string, featureName?: string, scenarioName?: string) {
	// Create output channel if it doesn't exist
	let outputChannel = vscode.window.createOutputChannel('Cucumber Godog');

	// Get the directory containing the feature file
	const dirPath = path.dirname(filePath);
	outputChannel.appendLine(`top level file: ${path.join(dirPath, '../')}`);
	const goSourcePath = path.join(dirPath, '../');

	// Build the go test command
	let testPattern = '';
	if (featureName && scenarioName) {
		testPattern = `/${sanitizeName(featureName)}/${sanitizeName(scenarioName)}$`;
	}
	else if (scenarioName) {
		testPattern = `//${sanitizeName(scenarioName)}$`;
	} else if (featureName) {
		testPattern = `/${sanitizeName(featureName)}/`;
	}

	// Force color output with environment variables and flags
	const command = `go test -v . ${testPattern ? `-run ${testPattern}` : ''}`;

	outputChannel.appendLine(`Running: ${command} in ${dirPath}`);

	// Terminal name
	const terminalName = `Cucumber Godog: ${testPattern ? testPattern : 'All'}`;

	// Check if a terminal with this name already exists
	let terminal: vscode.Terminal | undefined;
	for (const existingTerminal of vscode.window.terminals) {
		if (existingTerminal.name === terminalName) {
			terminal = existingTerminal;
			break;
		}
	}

	// If no existing terminal was found, create a new one
	if (!terminal) {
		terminal = vscode.window.createTerminal({
			name: terminalName,
			cwd: goSourcePath,
			env: {
				FORCE_COLOR: '1',
				COLORTERM: 'truecolor',
				TERM: 'xterm-256color',
				GO_TEST_COLOR: '1'  // Specific to Go tests
			}
		});
	}

	// Show the terminal and run the command
	terminal.show();
	terminal.sendText(command);
}
