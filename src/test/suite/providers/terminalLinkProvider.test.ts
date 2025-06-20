import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CucumberTerminalLinkProvider } from '../../../providers/terminalLinkProvider';
import * as featureService from '../../../services/featureService';

suite('TerminalLinkProvider Test Suite', () => {
	let sandbox: sinon.SinonSandbox;
	let featureCacheStub: sinon.SinonStub;
	let ensureFeatureCacheInitializedStub: sinon.SinonStub;
	let findFeatureFilesStub: sinon.SinonStub;
	let openTextDocumentStub: sinon.SinonStub;
	let showTextDocumentStub: sinon.SinonStub;
	let provider: CucumberTerminalLinkProvider;
	let documentMock: any;
	let editorMock: any;

	const mockFeaturePath1 = '/path/to/feature1.feature';
	const mockFeaturePath2 = '/path/to/feature2.feature';
	const mockFeatureName1 = 'Test Feature 1';
	const mockFeatureName2 = 'Test Feature 2';
	const mockScenarioName1 = 'Test Scenario 1.1';
	const mockScenarioName2 = 'Test Scenario 1.2';

	setup(() => {
		sandbox = sinon.createSandbox();
		
		// Create document mock
		documentMock = {
			getText: () => `Feature: ${mockFeatureName1}\nScenario: ${mockScenarioName1}`
		};
		
		// Create editor mock
		editorMock = {
			revealRange: sinon.stub(),
			selection: null
		};
		
		// Create stubs for vscode APIs
		openTextDocumentStub = sandbox.stub(vscode.workspace, 'openTextDocument').resolves(documentMock);
		showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument').resolves(editorMock);
		
		// Create feature cache stub
		featureCacheStub = sandbox.stub(featureService, 'featureCache').value([
			{
				name: mockFeatureName1,
				filePath: mockFeaturePath1,
				scenarioNames: [mockScenarioName1, mockScenarioName2],
				scenarioLineNumbers: new Map([
					[mockScenarioName1, 5],
					[mockScenarioName2, 10]
				]),
				lineNumber: 1
			},
			{
				name: mockFeatureName2,
				filePath: mockFeaturePath2,
				scenarioNames: ['Test Scenario 2.1'],
				scenarioLineNumbers: new Map([
					['Test Scenario 2.1', 5]
				]),
				lineNumber: 1
			}
		]);
		
		// Create stubs for feature service functions
		ensureFeatureCacheInitializedStub = sandbox.stub(featureService, 'ensureFeatureCacheInitialized').resolves();
		findFeatureFilesStub = sandbox.stub(featureService, 'findFeatureFiles').resolves([mockFeaturePath1, mockFeaturePath2]);
		
		// Create provider instance
		provider = new CucumberTerminalLinkProvider();
	});

	teardown(() => {
		sandbox.restore();
	});

	test('provideTerminalLinks should provide links for feature names', async () => {
		const context = {
			line: 'Running Feature: Test Feature 1',
			terminal: {} as vscode.Terminal
		};
		
		const links = await provider.provideTerminalLinks(context, {} as vscode.CancellationToken);
		
		assert.strictEqual(links.length, 1);
		assert.strictEqual(links[0].startIndex, 17); // "Running Feature: " is 17 characters
		assert.strictEqual(links[0].length, mockFeatureName1.length);
		assert.strictEqual(links[0].tooltip, `Open feature: ${mockFeatureName1}`);
	});

	test('provideTerminalLinks should provide links for scenario names', async () => {
		const context = {
			line: 'Running Scenario: Test Scenario 1.1',
			terminal: {} as vscode.Terminal
		};
		
		const links = await provider.provideTerminalLinks(context, {} as vscode.CancellationToken);
		
		assert.strictEqual(links.length, 1);
		assert.strictEqual(links[0].startIndex, 18); // "Running Scenario: " is 18 characters
		assert.strictEqual(links[0].length, mockScenarioName1.length);
		assert.strictEqual(links[0].tooltip, `Open scenario: ${mockScenarioName1}`);
	});

	test('provideTerminalLinks should provide links for scenario names with line numbers', async () => {
		const context = {
			line: '  Scenario: Test Scenario 1.1          # Test Feature 1:6',
			terminal: {} as vscode.Terminal
		};
		
		const links = await provider.provideTerminalLinks(context, {} as vscode.CancellationToken);
		
		assert.strictEqual(links.length, 1);
		assert.strictEqual(links[0].startIndex, 12); // "  Scenario: " is 12 characters
		assert.strictEqual(links[0].length, mockScenarioName1.length);
		assert.strictEqual(links[0].tooltip, `Open scenario: Test Feature 1/Test Scenario 1.1:6`);
	});

	test('handleTerminalLink should open feature file for feature links', async () => {
		const link = new vscode.TerminalLink(0, 0, `Open feature: ${mockFeatureName1}`);
		
		await provider.handleTerminalLink(link);
		
		// Verify ensureFeatureCacheInitialized was called
		assert.strictEqual(ensureFeatureCacheInitializedStub.calledOnce, true);
		
		// Verify openTextDocument was called with the correct file path
		assert.strictEqual(openTextDocumentStub.calledOnce, true);
		assert.strictEqual(openTextDocumentStub.firstCall.args[0], mockFeaturePath1);
		
		// Verify showTextDocument was called
		assert.strictEqual(showTextDocumentStub.calledOnce, true);
		
		// Verify revealRange was called with the correct line number
		assert.strictEqual(editorMock.revealRange.calledOnce, true);
		const range = editorMock.revealRange.firstCall.args[0];
		assert.strictEqual(range.start.line, 1);
	});

	test('handleTerminalLink should open feature file for scenario links', async () => {
		const link = new vscode.TerminalLink(0, 0, `Open scenario: ${mockScenarioName1}`);
		
		await provider.handleTerminalLink(link);
		
		// Verify ensureFeatureCacheInitialized was called
		assert.strictEqual(ensureFeatureCacheInitializedStub.calledOnce, true);
		
		// Verify openTextDocument was called with the correct file path
		assert.strictEqual(openTextDocumentStub.calledOnce, true);
		assert.strictEqual(openTextDocumentStub.firstCall.args[0], mockFeaturePath1);
		
		// Verify showTextDocument was called
		assert.strictEqual(showTextDocumentStub.calledOnce, true);
		
		// Verify revealRange was called with the correct line number
		assert.strictEqual(editorMock.revealRange.calledOnce, true);
		const range = editorMock.revealRange.firstCall.args[0];
		assert.strictEqual(range.start.line, 5);
	});

	test('handleTerminalLink should open feature file for scenario links with line numbers', async () => {
		const link = new vscode.TerminalLink(0, 0, `Open scenario: ${mockFeatureName1}/${mockScenarioName1}:6`);
		
		await provider.handleTerminalLink(link);
		
		// Verify ensureFeatureCacheInitialized was called
		assert.strictEqual(ensureFeatureCacheInitializedStub.calledOnce, true);
		
		// Verify openTextDocument was called with the correct file path
		assert.strictEqual(openTextDocumentStub.calledOnce, true);
		assert.strictEqual(openTextDocumentStub.firstCall.args[0], mockFeaturePath1);
		
		// Verify showTextDocument was called
		assert.strictEqual(showTextDocumentStub.calledOnce, true);
		
		// Verify revealRange was called with the correct line number
		assert.strictEqual(editorMock.revealRange.calledOnce, true);
		const range = editorMock.revealRange.firstCall.args[0];
		assert.strictEqual(range.start.line, 5); // 6-1 because line numbers are 0-based in VS Code
	});

	test('handleTerminalLink should show error message if feature not found', async () => {
		const link = new vscode.TerminalLink(0, 0, `Open feature: Unknown Feature`);
		const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
		
		await provider.handleTerminalLink(link);
		
		// Verify showErrorMessage was called
		assert.strictEqual(showErrorMessageStub.calledOnce, true);
		assert.strictEqual(showErrorMessageStub.firstCall.args[0], 'Could not find feature: Unknown Feature');
	});
});