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

	// Initialize the feature cache
	initializeFeatureCache();

	// Set up file watcher for feature files
	const featureFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');

	// Update cache when feature files are created
	featureFileWatcher.onDidCreate(async (uri) => {
		console.log(`Feature file created: ${uri.fsPath}`);
		await updateFeatureCache();
	});

	// Update cache when feature files are changed
	featureFileWatcher.onDidChange(async (uri) => {
		console.log(`Feature file changed: ${uri.fsPath}`);
		await updateFeatureCache();
	});

	// Update cache when feature files are deleted
	featureFileWatcher.onDidDelete(async (uri) => {
		console.log(`Feature file deleted: ${uri.fsPath}`);
		await updateFeatureCache();
	});

	// Add the file watcher to subscriptions
	context.subscriptions.push(featureFileWatcher);

	// Register the terminal link provider
	const terminalLinkProvider = new CucumberTerminalLinkProvider();
	const terminalLinkProviderDisposable = vscode.window.registerTerminalLinkProvider(terminalLinkProvider);
	context.subscriptions.push(terminalLinkProviderDisposable);

 	// Register the run feature command
	const runFeatureDisposable = vscode.commands.registerCommand('cucumber-godog.runFeature', async (featureName?: string, filePath?: string) => {
		// If featureName and filePath are provided, run the test directly
		if (featureName && filePath) {
			runTest(filePath, featureName);
			return;
		}

		// If the feature cache is empty, initialize it
		if (featureCache.length === 0) {
			await initializeFeatureCache();
		}

		// Check if we have any features in the cache
		if (featureCache.length === 0) {
			vscode.window.showInformationMessage('No features found in the project.');
			return;
		}

		// Show quick pick to select a feature
		const selectedFeature = await vscode.window.showQuickPick(
			featureCache.map(f => ({ 
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

		// If the feature cache is empty, initialize it
		if (featureCache.length === 0) {
			await initializeFeatureCache();
		}

		// Check if we have any features in the cache
		if (featureCache.length === 0) {
			vscode.window.showInformationMessage('No features found in the project.');
			return;
		}

		// Show quick pick to select a feature
		const selectedFeature = await vscode.window.showQuickPick(
			featureCache.map(f => ({
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

// Global feature cache
let featureCache: FeatureInfo[] = [];

// Interface for feature information
interface FeatureInfo {
	name: string;
	scenarioNames: string[];
	scenarioLineNumbers: Map<string, number>; // Map scenario name to line number
	filePath: string;
	lineNumber: number; // Line number of the feature
}

// Function to initialize the feature cache
async function initializeFeatureCache(): Promise<void> {
	const featureFiles = await findFeatureFiles();
	if (featureFiles.length > 0) {
		featureCache = await extractFeatures(featureFiles);
		console.log(`Feature cache initialized with ${featureCache.length} features`);
	}
}

// Function to update the feature cache
async function updateFeatureCache(): Promise<void> {
	const featureFiles = await findFeatureFiles();
	if (featureFiles.length > 0) {
		featureCache = await extractFeatures(featureFiles);
		console.log(`Feature cache updated with ${featureCache.length} features`);
	} else {
		featureCache = [];
		console.log('Feature cache cleared (no feature files found)');
	}
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

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const featureMatch = line.match(FEATURE_PATTERN);
				if (featureMatch) {
					const featureName = featureMatch[2].trim();
					currentFeature = {
						name: featureName,
						scenarioNames: [],
						scenarioLineNumbers: new Map<string, number>(),
						filePath: filePath,
						lineNumber: i // Store the line number of the feature
					}
					features.push(currentFeature);
					continue;
				}

				const scenarioMatch = line.match(SCENARIO_PATTERN) || line.match(SCENARIO_OUTLINE_PATTERN);
				if (scenarioMatch && currentFeature) {
					const scenarioName = scenarioMatch[2].trim();
					currentFeature.scenarioNames.push(scenarioName);
					currentFeature.scenarioLineNumbers.set(scenarioName, i); // Store the line number of the scenario
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
	public async provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];
		const filePath = document.uri.fsPath;

		// If the feature cache is empty, initialize it
		if (featureCache.length === 0) {
			await initializeFeatureCache();
		}

		// Find the feature in the cache that matches this document
		const feature = featureCache.find(f => f.filePath === filePath);

		// If we found a matching feature, add code lenses for it and its scenarios
		if (feature) {
			// Add code lens for the feature
			const featureRange = new vscode.Range(feature.lineNumber, 0, feature.lineNumber, document.lineAt(feature.lineNumber).text.length);
			const runFeatureCommand = {
				title: '▶ Run Feature',
				command: 'cucumber-godog.runFeature',
				arguments: [feature.name, filePath]
			};
			codeLenses.push(new vscode.CodeLens(featureRange, runFeatureCommand));

			// Add code lenses for each scenario
			for (const scenarioName of feature.scenarioNames) {
				const lineNumber = feature.scenarioLineNumbers.get(scenarioName);
				if (lineNumber !== undefined) {
					const scenarioRange = new vscode.Range(lineNumber, 0, lineNumber, document.lineAt(lineNumber).text.length);
					const runScenarioCommand = {
						title: '▶ Run Scenario',
						command: 'cucumber-godog.runScenario',
						arguments: [feature.name, scenarioName, filePath]
					};
					codeLenses.push(new vscode.CodeLens(scenarioRange, runScenarioCommand));
				}
			}
		} else {
			// If the feature is not in the cache, parse the document directly
			// This is a fallback in case the cache is not up to date
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

			// Update the cache with this feature file
			await updateFeatureCache();
		}

		return codeLenses;
	}
}

function sanitizeName(name: string) {
	return name.replace(/[^a-zA-Z0-9]/g, '_');
}

// Terminal link provider for Cucumber feature files
class CucumberTerminalLinkProvider implements vscode.TerminalLinkProvider {
	// Regular expressions to match feature and scenario names in terminal output
	private featureRegex = /Feature: ([^\n]+)/g;
	private scenarioRegex = /Scenario: ([^\n]+)/g;
	private scenarioOutlineRegex = /Scenario Outline: ([^\n]+)/g;
	// Regular expression to match scenario with line number information
	private scenarioWithLineRegex = /\s*Scenario: ([^\n#]+)\s+# ([^:]+):(\d+)/g;

	// Method to provide terminal links
	async provideTerminalLinks(context: vscode.TerminalLinkContext, token: vscode.CancellationToken): Promise<vscode.TerminalLink[]> {
		const links: vscode.TerminalLink[] = [];
		const line = context.line;

		// Find scenario with line number information first (most specific)
		let match;
		while ((match = this.scenarioWithLineRegex.exec(line)) !== null) {
			if (token.isCancellationRequested) {
				break;
			}

			const scenarioName = match[1].trim();
			const featureName = match[2].trim();
			const lineNumber = parseInt(match[3], 10);

			links.push(new vscode.TerminalLink(
				line.indexOf(scenarioName),
				scenarioName.length,
				`Open scenario: ${featureName}/${scenarioName}:${lineNumber}`
			));
		}

		// Reset regex lastIndex
		this.scenarioWithLineRegex.lastIndex = 0;

		// Find feature names in the line
		while ((match = this.featureRegex.exec(line)) !== null) {
			if (token.isCancellationRequested) {
				break;
			}

			const featureName = match[1].trim();
			links.push(new vscode.TerminalLink(
				match.index + 9, // "Feature: " is 9 characters
				featureName.length,
				`Open feature: ${featureName}`
			));
		}

		// Reset regex lastIndex
		this.featureRegex.lastIndex = 0;

		// Find scenario names in the line (without line number information)
		while ((match = this.scenarioRegex.exec(line)) !== null) {
			// Skip if this scenario was already matched with line number information
			if (token.isCancellationRequested || this.scenarioWithLineRegex.test(line)) {
				break;
			}

			const scenarioName = match[1].trim();
			links.push(new vscode.TerminalLink(
				match.index + 10, // "Scenario: " is 10 characters
				scenarioName.length,
				`Open scenario: ${scenarioName}`
			));
		}

		// Reset regex lastIndex
		this.scenarioRegex.lastIndex = 0;

		// Find scenario outline names in the line
		while ((match = this.scenarioOutlineRegex.exec(line)) !== null) {
			if (token.isCancellationRequested) {
				break;
			}

			const scenarioName = match[1].trim();
			links.push(new vscode.TerminalLink(
				match.index + 18, // "Scenario Outline: " is 18 characters
				scenarioName.length,
				`Open scenario: ${scenarioName}`
			));
		}

		// Reset regex lastIndex
		this.scenarioOutlineRegex.lastIndex = 0;

		return links;
	}

	// Method to handle terminal links
	async handleTerminalLink(link: vscode.TerminalLink): Promise<void> {
		// Get the text of the link
		const tooltip = link.tooltip || '';
		const isFeature = tooltip.startsWith('Open feature:');
		const isScenario = tooltip.startsWith('Open scenario:');

		if (!isFeature && !isScenario) {
			return;
		}

		// Extract information from the tooltip
		const tooltipContent = tooltip.substring(tooltip.indexOf(':') + 1).trim();

		// Check if this is a scenario with line number information
		if (isScenario && tooltipContent.includes('/')) {
			// Format is "featureName/scenarioName:lineNumber"
			const parts = tooltipContent.split('/');
			if (parts.length === 2) {
				const scenarioName = parts[1];
				const featureName = parts[0];
				const scenarioLineNumber = scenarioName.split(':')[1];
				// subtract 1 because line numbers in the cache is 0-based, but the godog output shows 1-based
				const lineNumber = parseInt(scenarioLineNumber, 10)-1;

				// Find the feature file by name
				for (const feature of featureCache) {
					if (feature.name === featureName) {
						// Open the feature file and navigate directly to the specified line
						await this.openFeatureFile(feature.filePath, lineNumber);
						return;
					}
				}

				// If feature not found in cache, try to find it by name in all feature files
				const featureFiles = await findFeatureFiles();
				for (const filePath of featureFiles) {
					try {
						const document = await vscode.workspace.openTextDocument(filePath);
						const text = document.getText();
						if (text.includes(`Feature: ${featureName}`)) {
							// Open the file and navigate to the specified line
							await this.openFeatureFile(filePath, lineNumber);
							return;
						}
					} catch (error) {
						console.error(`Error reading feature file ${filePath}:`, error);
					}
				}

				vscode.window.showErrorMessage(`Could not find feature file for: ${featureName}`);
				return;
			}
		}

		// Handle regular feature or scenario links (without line number information)
		const name = tooltipContent;

		// Find the feature or scenario in the cache
		for (const feature of featureCache) {
			if (isFeature && feature.name === name) {
				// Open the feature file and navigate to the feature line
				await this.openFeatureFile(feature.filePath, feature.lineNumber);
				return;
			} else if (isScenario && feature.scenarioNames.includes(name)) {
				// Get the line number for this scenario
				const lineNumber = feature.scenarioLineNumbers.get(name);
				if (lineNumber !== undefined) {
					// Open the feature file and navigate to the scenario line
					await this.openFeatureFile(feature.filePath, lineNumber);
					return;
				}
			}
		}

		// If we get here, we couldn't find the feature or scenario
		vscode.window.showErrorMessage(`Could not find ${isFeature ? 'feature' : 'scenario'}: ${name}`);
	}

	// Method to open a feature file and navigate to a specific line
	private async openFeatureFile(filePath: string, lineNumber: number): Promise<void> {
		try {
			// Open the document
			const document = await vscode.workspace.openTextDocument(filePath);
			const editor = await vscode.window.showTextDocument(document);

			// Navigate to the line
			if (lineNumber >= 0) {
				const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
				editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
				editor.selection = new vscode.Selection(lineNumber, 0, lineNumber, 0);
			}
		} catch (error) {
			console.error(`Error opening feature file: ${error}`);
			vscode.window.showErrorMessage(`Error opening feature file: ${error}`);
		}
	}
}

// Function to run the test with godog
function runTest(filePath: string, featureName?: string, scenarioName?: string) {
	// Create output channel if it doesn't exist
	let outputChannel = vscode.window.createOutputChannel('Cucumber Godog');

	// Get the directory containing the feature file
	const dirPath = path.dirname(filePath);
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
