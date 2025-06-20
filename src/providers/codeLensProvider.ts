import * as vscode from 'vscode';
import { FeatureInfo } from '../models/featureInfo';
import { FEATURE_PATTERN, SCENARIO_PATTERN, SCENARIO_OUTLINE_PATTERN } from '../utils/constants';
import { featureCache, updateFeatureCache, ensureFeatureCacheInitialized } from '../services/featureService';

/**
 * Code lens provider for Cucumber feature files
 */
export class CucumberCodeLensProvider implements vscode.CodeLensProvider {
	/**
	 * Provides code lenses for a document
	 * @param document The document to provide code lenses for
	 * @param token A cancellation token
	 * @returns An array of code lenses
	 */
	public async provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];
		const filePath = document.uri.fsPath;

		// If the feature cache is empty, initialize it
		await ensureFeatureCacheInitialized();

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