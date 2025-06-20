import * as vscode from 'vscode';
import { FEATURE_PATTERN, SCENARIO_PATTERN, SCENARIO_OUTLINE_PATTERN } from '../utils/constants';
import { featureCache, findFeatureFiles, ensureFeatureCacheInitialized } from '../services/featureService';

/**
 * Terminal link provider for Cucumber feature files
 */
export class CucumberTerminalLinkProvider implements vscode.TerminalLinkProvider {
	// Regular expressions to match feature and scenario names in terminal output
	private featureRegex = /Feature: ([^\n]+)/g;
	private scenarioRegex = /Scenario: ([^\n]+)/g;
	private scenarioOutlineRegex = /Scenario Outline: ([^\n]+)/g;
	// Regular expression to match scenario with line number information
	private scenarioWithLineRegex = /\s*Scenario: ([^\n#]+)\s+# ([^:]+):(\d+)/g;

	/**
	 * Provides terminal links for a line
	 * @param context The terminal link context
	 * @param token A cancellation token
	 * @returns An array of terminal links
	 */
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

	/**
	 * Handles a terminal link
	 * @param link The terminal link
	 */
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
				await ensureFeatureCacheInitialized();
				
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

		// Ensure the feature cache is initialized
		await ensureFeatureCacheInitialized();

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

	/**
	 * Opens a feature file and navigates to a specific line
	 * @param filePath The path to the feature file
	 * @param lineNumber The line number to navigate to
	 */
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