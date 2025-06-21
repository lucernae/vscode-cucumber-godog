// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import {CucumberCodeLensProvider} from './providers/codeLensProvider';
import {CucumberTerminalLinkProvider} from './providers/terminalLinkProvider';
import {CucumberTestControllerProvider} from './providers/testControllerProvider';
import {
	ensureFeatureCacheInitialized,
	featureCache,
	initializeFeatureCache,
	updateFeatureCache,
} from './services/featureService';
import {runTest} from './services/testService';


/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
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

		// Ensure the feature cache is initialized
		await ensureFeatureCacheInitialized();

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

		// Ensure the feature cache is initialized
		await ensureFeatureCacheInitialized();

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
			return;
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

	// Initialize the test controller provider using the getInstance method
	const testControllerProvider = CucumberTestControllerProvider.getInstance(context);

	// Add all disposables to the context subscriptions
	context.subscriptions.push(
		runFeatureDisposable,
		runScenarioDisposable,
		codeLensProviderDisposable,
		{ dispose: () => testControllerProvider.dispose() }
	);
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {}
