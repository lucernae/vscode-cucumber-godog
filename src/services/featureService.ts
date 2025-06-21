import * as vscode from 'vscode';
import { FeatureInfo } from '../models/featureInfo';
import { FEATURE_PATTERN, SCENARIO_PATTERN, SCENARIO_OUTLINE_PATTERN } from '../utils/constants';
import {CucumberTestControllerProvider} from "../providers/testControllerProvider";

// Global feature cache
export let featureCache: FeatureInfo[] = [];

/**
 * Initializes the feature cache
 */
export async function initializeFeatureCache(): Promise<void> {
	const featureFiles = await findFeatureFiles();
	if (featureFiles.length > 0) {
		featureCache = await extractFeatures(featureFiles);
		console.log(`Feature cache initialized with ${featureCache.length} features`);
	}
}

/**
 * Updates the feature cache
 */
export async function updateFeatureCache(): Promise<void> {
	const featureFiles = await findFeatureFiles();
	if (featureFiles.length > 0) {
		featureCache = await extractFeatures(featureFiles);
		console.log(`Feature cache updated with ${featureCache.length} features`);
	} else {
		featureCache = [];
		console.log('Feature cache cleared (no feature files found)');
	}
}

/**
 * Finds all feature files in the workspace
 * @returns An array of file paths
 */
export async function findFeatureFiles(): Promise<string[]> {
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

/**
 * Extracts feature information from feature files
 * @param featureFiles An array of file paths
 * @returns An array of FeatureInfo objects
 */
export async function extractFeatures(featureFiles: string[]): Promise<FeatureInfo[]> {
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
					};
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

/**
 * Ensures the feature cache is initialized
 */
export async function ensureFeatureCacheInitialized(): Promise<void> {
	if (featureCache.length === 0) {
		await initializeFeatureCache();
	}
}