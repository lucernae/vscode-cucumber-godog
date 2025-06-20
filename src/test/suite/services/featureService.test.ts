import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { FeatureInfo } from '../../../models/featureInfo';
import { featureCache, findFeatureFiles, extractFeatures, initializeFeatureCache, updateFeatureCache, ensureFeatureCacheInitialized } from '../../../services/featureService';

suite('FeatureService Test Suite', () => {
	let sandbox: sinon.SinonSandbox;
	let workspaceStub: sinon.SinonStub;
	let findFilesStub: sinon.SinonStub;
	let openTextDocumentStub: sinon.SinonStub;
	let documentMock: any;

	const mockFeaturePath1 = '/path/to/feature1.feature';
	const mockFeaturePath2 = '/path/to/feature2.feature';
	
	const mockFeatureContent1 = `
Feature: Test Feature 1
  As a user
  I want to test feature 1
  So that I can verify it works

  Scenario: Test Scenario 1.1
    Given I have a test
    When I run it
    Then it should pass

  Scenario: Test Scenario 1.2
    Given I have another test
    When I run it
    Then it should also pass
`;

	const mockFeatureContent2 = `
Feature: Test Feature 2
  As a user
  I want to test feature 2
  So that I can verify it works

  Scenario: Test Scenario 2.1
    Given I have a test
    When I run it
    Then it should pass
`;

	setup(() => {
		sandbox = sinon.createSandbox();
		
		// Reset the feature cache
		while (featureCache.length > 0) {
			featureCache.pop();
		}
		
		// Create stubs for vscode APIs
		workspaceStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: { fsPath: '/workspace' } }] as any);
		
		findFilesStub = sandbox.stub(vscode.workspace, 'findFiles').resolves([
			{ fsPath: mockFeaturePath1 } as vscode.Uri,
			{ fsPath: mockFeaturePath2 } as vscode.Uri
		]);
		
		// Create document mocks
		const createDocumentMock = (content: string) => ({
			getText: () => content,
			lineAt: (line: number) => ({
				text: content.split('\n')[line]
			})
		});
		
		documentMock = {
			[mockFeaturePath1]: createDocumentMock(mockFeatureContent1),
			[mockFeaturePath2]: createDocumentMock(mockFeatureContent2)
		};
		
		openTextDocumentStub = sandbox.stub(vscode.workspace, 'openTextDocument').callsFake((path) => {
			return Promise.resolve(documentMock[path as string]);
		});
	});

	teardown(() => {
		sandbox.restore();
	});

	test('findFeatureFiles should return all feature files in the workspace', async () => {
		const files = await findFeatureFiles();
		
		assert.strictEqual(files.length, 2);
		assert.strictEqual(files[0], mockFeaturePath1);
		assert.strictEqual(files[1], mockFeaturePath2);
		
		assert.strictEqual(findFilesStub.calledOnce, true);
		assert.strictEqual(findFilesStub.firstCall.args[0], '**/*.feature');
		assert.strictEqual(findFilesStub.firstCall.args[1], '**/node_modules/**');
	});

	test('findFeatureFiles should return empty array if no workspace folders', async () => {
		workspaceStub.value(undefined);
		
		const files = await findFeatureFiles();
		
		assert.strictEqual(files.length, 0);
		assert.strictEqual(findFilesStub.called, false);
	});

	test('extractFeatures should parse feature files correctly', async () => {
		const features = await extractFeatures([mockFeaturePath1, mockFeaturePath2]);
		
		assert.strictEqual(features.length, 2);
		
		// Check first feature
		assert.strictEqual(features[0].name, 'Test Feature 1');
		assert.strictEqual(features[0].filePath, mockFeaturePath1);
		assert.strictEqual(features[0].scenarioNames.length, 2);
		assert.strictEqual(features[0].scenarioNames[0], 'Test Scenario 1.1');
		assert.strictEqual(features[0].scenarioNames[1], 'Test Scenario 1.2');
		
		// Check second feature
		assert.strictEqual(features[1].name, 'Test Feature 2');
		assert.strictEqual(features[1].filePath, mockFeaturePath2);
		assert.strictEqual(features[1].scenarioNames.length, 1);
		assert.strictEqual(features[1].scenarioNames[0], 'Test Scenario 2.1');
	});

	test('initializeFeatureCache should initialize the feature cache', async () => {
		await initializeFeatureCache();
		
		assert.strictEqual(featureCache.length, 2);
		assert.strictEqual(featureCache[0].name, 'Test Feature 1');
		assert.strictEqual(featureCache[1].name, 'Test Feature 2');
	});

	test('updateFeatureCache should update the feature cache', async () => {
		// First initialize with empty cache
		findFilesStub.resolves([]);
		await updateFeatureCache();
		assert.strictEqual(featureCache.length, 0);
		
		// Then update with files
		findFilesStub.resolves([
			{ fsPath: mockFeaturePath1 } as vscode.Uri,
			{ fsPath: mockFeaturePath2 } as vscode.Uri
		]);
		await updateFeatureCache();
		
		assert.strictEqual(featureCache.length, 2);
		assert.strictEqual(featureCache[0].name, 'Test Feature 1');
		assert.strictEqual(featureCache[1].name, 'Test Feature 2');
	});

	test('ensureFeatureCacheInitialized should initialize cache if empty', async () => {
		// Start with empty cache
		assert.strictEqual(featureCache.length, 0);
		
		await ensureFeatureCacheInitialized();
		
		assert.strictEqual(featureCache.length, 2);
	});

	test('ensureFeatureCacheInitialized should not initialize cache if not empty', async () => {
		// First initialize the cache
		await initializeFeatureCache();
		assert.strictEqual(featureCache.length, 2);
		
		// Reset stubs to track new calls
		findFilesStub.resetHistory();
		openTextDocumentStub.resetHistory();
		
		// Call ensureFeatureCacheInitialized
		await ensureFeatureCacheInitialized();
		
		// Verify no new calls were made
		assert.strictEqual(findFilesStub.called, false);
		assert.strictEqual(openTextDocumentStub.called, false);
	});
});