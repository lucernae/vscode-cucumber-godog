import * as vscode from 'vscode';
import * as path from 'path';
import { FeatureInfo } from '../models/featureInfo';
import { featureCache, updateFeatureCache, ensureFeatureCacheInitialized } from '../services/featureService';
import { runTest } from '../services/testService';

/**
 * Test controller provider for Cucumber feature files
 */
export class CucumberTestControllerProvider {
    private static readonly CONTROLLER_ID = 'cucumber-godog-test-controller';
    private static readonly CONTROLLER_LABEL = 'Cucumber Godog Tests';
    private static instances: Map<string, CucumberTestControllerProvider> = new Map();

    private testController: vscode.TestController;
    private testItems: Map<string, vscode.TestItem> = new Map();
    private disposables: vscode.Disposable[] = [];

    /**
     * Gets an existing instance of the test controller provider with the given ID,
     * or creates a new one if it doesn't exist
     * @param id The ID of the test controller
     * @returns The test controller provider instance
     */
    public static getInstance(context: vscode.ExtensionContext): CucumberTestControllerProvider {
        const id = this.CONTROLLER_ID;
        let instance = this.instances.get(id);

        if (instance) {
            // If an instance already exists, dispose it before creating a new one
            instance.dispose();
        }

        // Create a new instance
        instance = new CucumberTestControllerProvider(context);
        this.instances.set(id, instance);

        return instance;
    }

    constructor(context: vscode.ExtensionContext) {
        // Check if a controller with this ID already exists
        const existingInstance = CucumberTestControllerProvider.instances.get(CucumberTestControllerProvider.CONTROLLER_ID);
        if (existingInstance) {
            // If an instance already exists, dispose it
            existingInstance.dispose();
            CucumberTestControllerProvider.instances.delete(CucumberTestControllerProvider.CONTROLLER_ID);
        }

        // Create the test controller
        this.testController = vscode.tests.createTestController(
            CucumberTestControllerProvider.CONTROLLER_ID, 
            CucumberTestControllerProvider.CONTROLLER_LABEL
        );
        context.subscriptions.push(this.testController);

        // Set the resolve handler to load test items on demand
        this.testController.resolveHandler = this.resolveHandler.bind(this);

        // Set the run handler to run tests
        this.testController.createRunProfile(
            'Run',
            vscode.TestRunProfileKind.Run,
            this.runHandler.bind(this),
            true
        );

        // Watch for file changes
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');
        this.disposables.push(fileWatcher);

        // Update tests when feature files change
        fileWatcher.onDidCreate(uri => this.updateTests());
        fileWatcher.onDidChange(uri => this.updateTests());
        fileWatcher.onDidDelete(uri => this.updateTests());

        // Initial load of tests
        this.loadTests();

        // Register this instance
        CucumberTestControllerProvider.instances.set(CucumberTestControllerProvider.CONTROLLER_ID, this);
    }

    /**
     * Loads all tests from the feature cache
     */
    private async loadTests(): Promise<void> {
        await ensureFeatureCacheInitialized();
        this.updateTests();
    }

    /**
     * Updates the test items based on the feature cache
     */
    private async updateTests(): Promise<void> {
        await updateFeatureCache();

        // Clear existing test items
        this.testController.items.replace([]);
        this.testItems.clear();

        // Create test items for each feature
        for (const feature of featureCache) {
            const featureUri = vscode.Uri.file(feature.filePath);
            const featureItem = this.testController.createTestItem(
                `feature:${feature.filePath}:${feature.name}`,
                feature.name,
                featureUri
            );

            // Set the feature location
            featureItem.range = new vscode.Range(
                new vscode.Position(feature.lineNumber, 0),
                new vscode.Position(feature.lineNumber, 0)
            );

            // Add the feature to the test controller
            this.testController.items.add(featureItem);
            this.testItems.set(featureItem.id, featureItem);

            // Create test items for each scenario
            for (const scenarioName of feature.scenarioNames) {
                const lineNumber = feature.scenarioLineNumbers.get(scenarioName);
                if (lineNumber !== undefined) {
                    const scenarioItem = this.testController.createTestItem(
                        `scenario:${feature.filePath}:${feature.name}:${scenarioName}`,
                        scenarioName,
                        featureUri
                    );

                    // Set the scenario location
                    scenarioItem.range = new vscode.Range(
                        new vscode.Position(lineNumber, 0),
                        new vscode.Position(lineNumber, 0)
                    );

                    // Add the scenario to the feature
                    featureItem.children.add(scenarioItem);
                    this.testItems.set(scenarioItem.id, scenarioItem);
                }
            }
        }
    }

    /**
     * Resolve handler for the test controller
     * @param item The test item to resolve
     */
    private async resolveHandler(item: vscode.TestItem | undefined): Promise<void> {
        if (!item) {
            // If no item is provided, load all tests
            await this.loadTests();
        }
    }

    /**
     * Run handler for the test controller
     * @param request The test run request
     * @param token A cancellation token
     */
    private async runHandler(
        request: vscode.TestRunRequest,
        token: vscode.CancellationToken
    ): Promise<void> {
        const run = this.testController.createTestRun(request);
        const queue: vscode.TestItem[] = [];

        // If specific tests are requested, run those
        if (request.include) {
            request.include.forEach(item => queue.push(item));
        } else {
            // Otherwise, run all tests
            this.testController.items.forEach(item => queue.push(item));
        }

        // Process each test item
        while (queue.length > 0 && !token.isCancellationRequested) {
            const item = queue.shift()!;

            // If the item has children, add them to the queue
            if (item.children.size > 0) {
                item.children.forEach(child => queue.push(child));
                continue;
            }

            // Run the test
            run.started(item);

            try {
                // Extract feature and scenario information from the test item ID
                const parts = item.id.split(':');
                const type = parts[0];
                const filePath = parts[1];
                const featureName = parts[2];

                if (type === 'feature') {
                    // Run the feature
                    runTest(filePath, featureName);
                    run.passed(item);
                } else if (type === 'scenario') {
                    // Run the scenario
                    const scenarioName = parts[3];
                    runTest(filePath, featureName, scenarioName);
                    run.passed(item);
                }
            } catch (error) {
                run.failed(item, new vscode.TestMessage(`Failed to run test: ${error}`));
            }
        }

        run.end();
    }

    /**
     * Disposes of the test controller and other resources
     */
    public dispose(): void {
        this.testController.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
