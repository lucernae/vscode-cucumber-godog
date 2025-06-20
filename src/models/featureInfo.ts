// Interface for feature information
export interface FeatureInfo {
	name: string;
	scenarioNames: string[];
	scenarioLineNumbers: Map<string, number>; // Map scenario name to line number
	filePath: string;
	lineNumber: number; // Line number of the feature
}