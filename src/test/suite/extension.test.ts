import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as extension from '../../extension';
import * as featureService from '../../services/featureService';
import * as testService from '../../services/testService';
import { CucumberCodeLensProvider } from '../../providers/codeLensProvider';
import { CucumberTerminalLinkProvider } from '../../providers/terminalLinkProvider';

suite('Extension Test Suite', () => {
	let sandbox: sinon.SinonSandbox;
	let initializeFeatureCacheStub: sinon.SinonStub;
	let updateFeatureCacheStub: sinon.SinonStub;
	let ensureFeatureCacheInitializedStub: sinon.SinonStub;
	let runTestStub: sinon.SinonStub;
	let registerCommandStub: sinon.SinonStub;
	let registerTerminalLinkProviderStub: sinon.SinonStub;
	let registerCodeLensProviderStub: sinon.SinonStub;
	let createFileSystemWatcherStub: sinon.SinonStub;
	let watcherMock: any;
	let contextMock: any;
	let showQuickPickStub: sinon.SinonStub;
	let showInformationMessageStub: sinon.SinonStub;

	setup(() => {
		sandbox = sinon.createSandbox();
		
		// Create stubs for feature service
		initializeFeatureCacheStub = sandbox.stub(featureService, 'initializeFeatureCache').resolves();
		updateFeatureCacheStub = sandbox.stub(featureService, 'updateFeatureCache').resolves();
		ensureFeatureCacheInitializedStub = sandbox.stub(featureService, 'ensureFeatureCacheInitialized').resolves();
		sandbox.stub(featureService, 'featureCache').value([
			{
				name: 'Test Feature',
				filePath: '/path/to/feature.feature',
				scenarioNames: ['Test Scenario 1', 'Test Scenario 2'],
				scenarioLineNumbers: new Map([
					['Test Scenario 1', 5],
					['Test Scenario 2', 10]
				]),
				lineNumber: 1
			}
		]);
		
		// Create stub for test service
		runTestStub = sandbox.stub(testService, 'runTest');
		
		// Create watcher mock
		watcherMock = {
			onDidCreate: sinon.stub().returns({ dispose: () => {} }),
			onDidChange: sinon.stub().returns({ dispose: () => {} }),
			onDidDelete: sinon.stub().returns({ dispose: () => {} }),
			dispose: sinon.stub()
		};
		
		// Create stubs for vscode APIs
		createFileSystemWatcherStub = sandbox.stub(vscode.workspace, 'createFileSystemWatcher').returns(watcherMock);
		registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
		registerTerminalLinkProviderStub = sandbox.stub(vscode.window, 'registerTerminalLinkProvider').returns({ dispose: () => {} });
		registerCodeLensProviderStub = sandbox.stub(vscode.languages, 'registerCodeLensProvider').returns({ dispose: () => {} });
		showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
		showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
		
		// Create context mock
		contextMock = {
			subscriptions: []
		};
	});

	teardown(() => {
		sandbox.restore();
	});

	test('activate should initialize feature cache and register providers', async () => {
		await extension.activate(contextMock);
		
		// Verify feature cache was initialized
		assert.strictEqual(initializeFeatureCacheStub.calledOnce, true);
		
		// Verify file watcher was created
		assert.strictEqual(createFileSystemWatcherStub.calledOnce, true);
		assert.strictEqual(createFileSystemWatcherStub.firstCall.args[0], '**/*.feature');
		
		// Verify file watcher events were registered
		assert.strictEqual(watcherMock.onDidCreate.calledOnce, true);
		assert.strictEqual(watcherMock.onDidChange.calledOnce, true);
		assert.strictEqual(watcherMock.onDidDelete.calledOnce, true);
		
		// Verify terminal link provider was registered
		assert.strictEqual(registerTerminalLinkProviderStub.calledOnce, true);
		assert.ok(registerTerminalLinkProviderStub.firstCall.args[0] instanceof CucumberTerminalLinkProvider);
		
		// Verify commands were registered
		assert.strictEqual(registerCommandStub.callCount, 2);
		assert.strictEqual(registerCommandStub.firstCall.args[0], 'cucumber-godog.runFeature');
		assert.strictEqual(registerCommandStub.secondCall.args[0], 'cucumber-godog.runScenario');
		
		// Verify code lens provider was registered
		assert.strictEqual(registerCodeLensProviderStub.calledOnce, true);
		assert.deepStrictEqual(registerCodeLensProviderStub.firstCall.args[0], { language: 'feature' });
		assert.ok(registerCodeLensProviderStub.firstCall.args[1] instanceof CucumberCodeLensProvider);
		
		// Verify context subscriptions were added
		assert.strictEqual(contextMock.subscriptions.length, 5);
	});

	test('runFeature command should run test directly if feature name and file path are provided', async () => {
		await extension.activate(contextMock);
		
		// Get the runFeature command handler
		const runFeatureHandler = registerCommandStub.firstCall.args[1];
		
		// Call the handler with feature name and file path
		await runFeatureHandler('Test Feature', '/path/to/feature.feature');
		
		// Verify runTest was called with the correct parameters
		assert.strictEqual(runTestStub.calledOnce, true);
		assert.strictEqual(runTestStub.firstCall.args[0], '/path/to/feature.feature');
		assert.strictEqual(runTestStub.firstCall.args[1], 'Test Feature');
		assert.strictEqual(runTestStub.firstCall.args[2], undefined);
	});

	test('runFeature command should show quick pick if feature name and file path are not provided', async () => {
		// Set up showQuickPick to return a selected feature
		showQuickPickStub.resolves({
			label: 'Test Feature',
			description: 'feature.feature',
			detail: '/path/to/feature.feature'
		});
		
		await extension.activate(contextMock);
		
		// Get the runFeature command handler
		const runFeatureHandler = registerCommandStub.firstCall.args[1];
		
		// Call the handler without parameters
		await runFeatureHandler();
		
		// Verify ensureFeatureCacheInitialized was called
		assert.strictEqual(ensureFeatureCacheInitializedStub.calledOnce, true);
		
		// Verify showQuickPick was called
		assert.strictEqual(showQuickPickStub.calledOnce, true);
		
		// Verify runTest was called with the correct parameters
		assert.strictEqual(runTestStub.calledOnce, true);
		assert.strictEqual(runTestStub.firstCall.args[0], '/path/to/feature.feature');
		assert.strictEqual(runTestStub.firstCall.args[1], 'Test Feature');
	});

	test('runScenario command should run test directly if feature name, scenario name, and file path are provided', async () => {
		await extension.activate(contextMock);
		
		// Get the runScenario command handler
		const runScenarioHandler = registerCommandStub.secondCall.args[1];
		
		// Call the handler with feature name, scenario name, and file path
		await runScenarioHandler('Test Feature', 'Test Scenario 1', '/path/to/feature.feature');
		
		// Verify runTest was called with the correct parameters
		assert.strictEqual(runTestStub.calledOnce, true);
		assert.strictEqual(runTestStub.firstCall.args[0], '/path/to/feature.feature');
		assert.strictEqual(runTestStub.firstCall.args[1], 'Test Feature');
		assert.strictEqual(runTestStub.firstCall.args[2], 'Test Scenario 1');
	});

	test('deactivate should do nothing', () => {
		// Just call deactivate to ensure it doesn't throw
		extension.deactivate();
	});
});