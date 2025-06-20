import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CucumberCodeLensProvider } from '../../../providers/codeLensProvider';
import * as featureService from '../../../services/featureService';

suite('CodeLensProvider Test Suite', () => {
	let sandbox: sinon.SinonSandbox;
	let featureCacheStub: sinon.SinonStub;
	let ensureFeatureCacheInitializedStub: sinon.SinonStub;
	let updateFeatureCacheStub: sinon.SinonStub;
	let documentMock: any;
	let provider: CucumberCodeLensProvider;

	const mockFilePath = '/path/to/feature.feature';
	const mockFeatureName = 'Test Feature';
	const mockScenarioName1 = 'Test Scenario 1';
	const mockScenarioName2 = 'Test Scenario 2';

	setup(() => {
		sandbox = sinon.createSandbox();
		
		// Create document mock
		documentMock = {
			uri: { fsPath: mockFilePath },
			lineCount: 20,
			lineAt: (line: number) => {
				let text = '';
				if (line === 2) {
					text = 'Feature: Test Feature';
				} else if (line === 10) {
					text = '  Scenario: Test Scenario 1';
				} else if (line === 15) {
					text = '  Scenario: Test Scenario 2';
				}
				return { text };
			}
		};
		
		// Create feature cache stub
		featureCacheStub = sandbox.stub(featureService, 'featureCache').value([
			{
				name: mockFeatureName,
				filePath: mockFilePath,
				scenarioNames: [mockScenarioName1, mockScenarioName2],
				scenarioLineNumbers: new Map([
					[mockScenarioName1, 10],
					[mockScenarioName2, 15]
				]),
				lineNumber: 2
			}
		]);
		
		// Create stubs for feature service functions
		ensureFeatureCacheInitializedStub = sandbox.stub(featureService, 'ensureFeatureCacheInitialized').resolves();
		updateFeatureCacheStub = sandbox.stub(featureService, 'updateFeatureCache').resolves();
		
		// Create provider instance
		provider = new CucumberCodeLensProvider();
	});

	teardown(() => {
		sandbox.restore();
	});

	test('provideCodeLenses should provide code lenses for features and scenarios from cache', async () => {
		const codeLenses = await provider.provideCodeLenses(documentMock, {} as vscode.CancellationToken);
		
		// Verify ensureFeatureCacheInitialized was called
		assert.strictEqual(ensureFeatureCacheInitializedStub.calledOnce, true);
		
		// Verify we got 3 code lenses (1 for feature, 2 for scenarios)
		assert.strictEqual(codeLenses.length, 3);
		
		// Verify feature code lens
		const featureCodeLens = codeLenses[0];
		assert.strictEqual(featureCodeLens.range.start.line, 2);
		assert.strictEqual(featureCodeLens.command?.title, '▶ Run Feature');
		assert.strictEqual(featureCodeLens.command?.command, 'cucumber-godog.runFeature');
		assert.deepStrictEqual(featureCodeLens.command?.arguments, [mockFeatureName, mockFilePath]);
		
		// Verify first scenario code lens
		const scenario1CodeLens = codeLenses[1];
		assert.strictEqual(scenario1CodeLens.range.start.line, 10);
		assert.strictEqual(scenario1CodeLens.command?.title, '▶ Run Scenario');
		assert.strictEqual(scenario1CodeLens.command?.command, 'cucumber-godog.runScenario');
		assert.deepStrictEqual(scenario1CodeLens.command?.arguments, [mockFeatureName, mockScenarioName1, mockFilePath]);
		
		// Verify second scenario code lens
		const scenario2CodeLens = codeLenses[2];
		assert.strictEqual(scenario2CodeLens.range.start.line, 15);
		assert.strictEqual(scenario2CodeLens.command?.title, '▶ Run Scenario');
		assert.strictEqual(scenario2CodeLens.command?.command, 'cucumber-godog.runScenario');
		assert.deepStrictEqual(scenario2CodeLens.command?.arguments, [mockFeatureName, mockScenarioName2, mockFilePath]);
	});

	test('provideCodeLenses should fall back to parsing document if feature not in cache', async () => {
		// Empty the feature cache
		featureCacheStub.value([]);
		
		const codeLenses = await provider.provideCodeLenses(documentMock, {} as vscode.CancellationToken);
		
		// Verify ensureFeatureCacheInitialized was called
		assert.strictEqual(ensureFeatureCacheInitializedStub.calledOnce, true);
		
		// Verify updateFeatureCache was called
		assert.strictEqual(updateFeatureCacheStub.calledOnce, true);
		
		// Verify we got 3 code lenses (1 for feature, 2 for scenarios)
		assert.strictEqual(codeLenses.length, 3);
		
		// Verify feature code lens
		const featureCodeLens = codeLenses[0];
		assert.strictEqual(featureCodeLens.range.start.line, 2);
		assert.strictEqual(featureCodeLens.command?.title, '▶ Run Feature');
		assert.strictEqual(featureCodeLens.command?.command, 'cucumber-godog.runFeature');
		assert.deepStrictEqual(featureCodeLens.command?.arguments, [mockFeatureName, mockFilePath]);
		
		// Verify first scenario code lens
		const scenario1CodeLens = codeLenses[1];
		assert.strictEqual(scenario1CodeLens.range.start.line, 10);
		assert.strictEqual(scenario1CodeLens.command?.title, '▶ Run Scenario');
		assert.strictEqual(scenario1CodeLens.command?.command, 'cucumber-godog.runScenario');
		assert.deepStrictEqual(scenario1CodeLens.command?.arguments, [mockFeatureName, mockScenarioName1, mockFilePath]);
		
		// Verify second scenario code lens
		const scenario2CodeLens = codeLenses[2];
		assert.strictEqual(scenario2CodeLens.range.start.line, 15);
		assert.strictEqual(scenario2CodeLens.command?.title, '▶ Run Scenario');
		assert.strictEqual(scenario2CodeLens.command?.command, 'cucumber-godog.runScenario');
		assert.deepStrictEqual(scenario2CodeLens.command?.arguments, [mockFeatureName, mockScenarioName2, mockFilePath]);
	});
});