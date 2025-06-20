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
	console.log('Congratulations, your extension "cucumber-godog" is now active!');

	// Register the hello world command (keeping it for reference)
	const helloWorldDisposable = vscode.commands.registerCommand('cucumber-godog.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from cucumber-godog!');
	});

	// Register the run feature command
	const runFeatureDisposable = vscode.commands.registerCommand('cucumber-godog.runFeature', (featureName: string, filePath: string) => {
		runTest(filePath, featureName);
	});

	// Register the run scenario command
	const runScenarioDisposable = vscode.commands.registerCommand('cucumber-godog.runScenario', (featureName: string, scenarioName: string, filePath: string) => {
		runTest(filePath, featureName, scenarioName);
	});

	// Register the code lens provider
	const codeLensProvider = new CucumberCodeLensProvider();
	const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
		{ language: 'feature' },
		codeLensProvider
	);

	// Add all disposables to the context subscriptions
	context.subscriptions.push(
		helloWorldDisposable,
		runFeatureDisposable,
		runScenarioDisposable,
		codeLensProviderDisposable
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}

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
	// Get the directory containing the feature file
	const dirPath = path.dirname(filePath);

	// Build the go test command
	let testPattern = '';
	if (featureName && scenarioName) {
		testPattern = `/${sanitizeName(featureName)}/${sanitizeName(scenarioName)}/`;
	}
	else if (scenarioName) {
		testPattern = `//${sanitizeName(scenarioName)}/`;
	} else if (featureName) {
		testPattern = `/${sanitizeName(featureName)}/`;
	}

	const command = `go test -v ../. ${testPattern ? `-run ${testPattern}` : ''}`;

	// Create output channel if it doesn't exist
	let outputChannel = vscode.window.createOutputChannel('Cucumber Godog');
	outputChannel.show();
	outputChannel.appendLine(`Running: ${command} in ${dirPath}`);

	// Execute the command
	const process = cp.exec(command, { cwd: dirPath });

	// Handle output
	process.stdout?.on('data', (data) => {
		outputChannel.append(data.toString());
	});

	process.stderr?.on('data', (data) => {
		outputChannel.append(data.toString());
	});

	// Handle process completion
	process.on('close', (code) => {
		if (code === 0) {
			outputChannel.appendLine('\nTests completed successfully.');
		} else {
			outputChannel.appendLine(`\nTests failed with exit code ${code}.`);
		}
	});
}
