import * as vscode from 'vscode';
import * as path from 'path';
import { sanitizeName } from '../utils/stringUtils';

/**
 * Runs a test with godog
 * @param filePath The path to the feature file
 * @param featureName The name of the feature (optional)
 * @param scenarioName The name of the scenario (optional)
 */
export function runTest(filePath: string, featureName?: string, scenarioName?: string): void {
	// Create output channel if it doesn't exist
	let outputChannel = vscode.window.createOutputChannel('Cucumber Godog');

	// Get the directory containing the feature file
	const dirPath = path.dirname(filePath);

	// Get configuration values
	const config = vscode.workspace.getConfiguration('cucumber-godog');
	const program = config.get<string>('program', 'go');
	const programArgument = config.get<string>('programArgument', 'test -v .');
	const programWorkingDirectory = config.get<string>('programWorkingDirectory', '../');
	const testPatternFormat = config.get<string>('testPatternFormat', '/${sanitizedFeatureName}/${sanitizedScenarioName}$');

	// Calculate the working directory
	const workingDir = calculateWorkingDirectory(dirPath, programWorkingDirectory);

	// Prepare variables for substitution
	const sanitizedFeatureName = featureName ? sanitizeName(featureName) : '';
	const sanitizedScenarioName = scenarioName ? sanitizeName(scenarioName) : '';

	// Build the test pattern with variable substitution
	const testPattern = buildTestPattern(testPatternFormat, featureName, scenarioName, sanitizedFeatureName, sanitizedScenarioName, filePath);

	// Build the command
	const runArg = testPattern ? `-run "${testPattern}"` : '';
	const command = `${program} ${programArgument} ${runArg}`.trim();

	outputChannel.appendLine(`Running: ${command} in ${workingDir}`);

	// Get or create terminal
	const terminal = getOrCreateTerminal(testPattern, workingDir);

	// Show the terminal and run the command
	terminal.show();
	terminal.sendText(command);
}

/**
 * Calculates the working directory for the test
 * @param dirPath The directory containing the feature file
 * @param programWorkingDirectory The configured working directory
 * @returns The absolute path to the working directory
 */
function calculateWorkingDirectory(dirPath: string, programWorkingDirectory: string): string {
	if (programWorkingDirectory.startsWith('.')) {
		// if so, calculate the working directory relative to the feature file
		const relativePath = path.join(dirPath, programWorkingDirectory);
		return path.resolve(relativePath);
	} else {
		// if not, use the programWorkingDirectory as is
		return path.resolve(dirPath, programWorkingDirectory);
	}
}

/**
 * Builds the test pattern with variable substitution
 * @param testPatternFormat The format of the test pattern
 * @param featureName The name of the feature
 * @param scenarioName The name of the scenario
 * @param sanitizedFeatureName The sanitized name of the feature
 * @param sanitizedScenarioName The sanitized name of the scenario
 * @param featureFilePath The path to the feature file
 * @returns The test pattern
 */
function buildTestPattern(
	testPatternFormat: string,
	featureName?: string,
	scenarioName?: string,
	sanitizedFeatureName?: string,
	sanitizedScenarioName?: string,
	featureFilePath?: string
): string {
	let testPattern = '';
	if (featureName || scenarioName) {
		// Create a map of variables for substitution
		const variables: Record<string, string> = {
			'${featureName}': featureName || '',
			'${scenarioName}': scenarioName || '',
			'${sanitizedFeatureName}': sanitizedFeatureName || '',
			'${sanitizedScenarioName}': sanitizedScenarioName || '',
			'${featureFilePath}': featureFilePath || ''
		};

		// Replace variables in the test pattern format
		testPattern = testPatternFormat;
		for (const [variable, value] of Object.entries(variables)) {
			testPattern = testPattern.replace(variable, value);
		}

		// If no variables were replaced (using old format), fall back to the default behavior
		if (testPattern === testPatternFormat) {
			if (featureName && scenarioName) {
				testPattern = `/${sanitizedFeatureName}/${sanitizedScenarioName}$`;
			}
			else if (scenarioName) {
				testPattern = `//${sanitizedScenarioName}$`;
			} else if (featureName) {
				testPattern = `/${sanitizedFeatureName}/`;
			}
		}
	}

	return testPattern;
}

/**
 * Gets an existing terminal or creates a new one
 * @param testPattern The test pattern
 * @param workingDir The working directory
 * @returns The terminal
 */
function getOrCreateTerminal(testPattern: string, workingDir: string): vscode.Terminal {
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
			cwd: workingDir,
			env: {
				FORCE_COLOR: '1',
				COLORTERM: 'truecolor',
				TERM: 'xterm-256color',
				GO_TEST_COLOR: '1'  // Specific to Go tests
			}
		});
	}

	return terminal;
}