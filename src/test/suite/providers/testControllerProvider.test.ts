import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CucumberTestControllerProvider } from '../../../providers/testControllerProvider';
import * as featureService from '../../../services/featureService';
import * as testService from '../../../services/testService';

suite('TestControllerProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let featureCacheStub: sinon.SinonStub;
    let ensureFeatureCacheInitializedStub: sinon.SinonStub;
    let updateFeatureCacheStub: sinon.SinonStub;
    let runTestStub: sinon.SinonStub;
    let testControllerProvider: CucumberTestControllerProvider;

    // Mock VS Code objects
    let testControllerMock: any;
    let testItemsMock: any;
    let testRunMock: any;
    let contextMock: any;
    let fileWatcherMock: any;

    // Mock data
    const mockFilePath = '/path/to/feature.feature';
    const mockFeatureName = 'Test Feature';
    const mockScenarioName1 = 'Test Scenario 1';
    const mockScenarioName2 = 'Test Scenario 2';

    setup(() => {
        sandbox = sinon.createSandbox();

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

        // Create stub for runTest function
        runTestStub = sandbox.stub(testService, 'runTest');

        // Create test items mock
        testItemsMock = {
            add: sandbox.stub(),
            replace: sandbox.stub(),
            forEach: sandbox.stub().callsFake((callback) => {
                // Simulate iterating over test items
                const testItems = [
                    { id: 'feature:' + mockFilePath + ':' + mockFeatureName, children: { size: 2 } }
                ];
                testItems.forEach(callback);
            })
        };

        // Create test run mock
        testRunMock = {
            started: sandbox.stub(),
            passed: sandbox.stub(),
            failed: sandbox.stub(),
            end: sandbox.stub()
        };

        // Create test controller mock
        testControllerMock = {
            items: testItemsMock,
            createTestItem: sandbox.stub().callsFake((id, label, uri) => {
                return {
                    id,
                    label,
                    uri,
                    children: {
                        add: sandbox.stub(),
                        size: id.startsWith('feature:') ? 2 : 0
                    }
                };
            }),
            createTestRun: sandbox.stub().returns(testRunMock),
            createRunProfile: sandbox.stub(),
            dispose: sandbox.stub()
        };

        // Create file watcher mock
        fileWatcherMock = {
            onDidCreate: sandbox.stub(),
            onDidChange: sandbox.stub(),
            onDidDelete: sandbox.stub(),
            dispose: sandbox.stub()
        };

        // Create context mock
        contextMock = {
            subscriptions: []
        };

        // Create test controller provider instance
        testControllerProvider = new CucumberTestControllerProvider(contextMock);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('updateTests should create test items for features and scenarios', async () => {
        // Call the private method using any type assertion
        await (testControllerProvider as any).updateTests();

        // Verify feature cache was updated
        assert.strictEqual(updateFeatureCacheStub.calledOnce, true);

        // Verify test items were replaced
        assert.strictEqual(testItemsMock.replace.calledOnce, true);

        // Verify test items were created for features
        assert.strictEqual(testControllerMock.createTestItem.called, true);

        // Verify test items were added to the controller
        assert.strictEqual(testItemsMock.add.called, true);
    });

    test('resolveHandler should load all tests when no item is provided', async () => {
        // Create a spy on the loadTests method
        const loadTestsSpy = sandbox.spy(testControllerProvider as any, 'loadTests');

        // Call the resolveHandler with no item
        await (testControllerProvider as any).resolveHandler(undefined);

        // Verify loadTests was called
        assert.strictEqual(loadTestsSpy.calledOnce, true);
    });

    test('runHandler should run tests for specified items', async () => {
        // Create test items
        const featureItem = {
            id: 'feature:' + mockFilePath + ':' + mockFeatureName,
            children: { size: 0, forEach: sandbox.stub() }
        };

        // Create test run request
        const request = {
            include: [featureItem]
        };

        // Create cancellation token
        const token = { isCancellationRequested: false };

        // Call the runHandler
        await (testControllerProvider as any).runHandler(request, token);

        // Verify test run was created
        assert.strictEqual(testControllerMock.createTestRun.calledOnce, true);

        // Verify test was started
        assert.strictEqual(testRunMock.started.called, true);

        // Verify runTest was called with correct parameters
        assert.strictEqual(runTestStub.called, true);

        // Verify test was marked as passed
        assert.strictEqual(testRunMock.passed.called, true);

        // Verify test run was ended
        assert.strictEqual(testRunMock.end.calledOnce, true);
    });

    test('runHandler should handle errors when running tests', async () => {
        // Create test items
        const scenarioItem = {
            id: 'scenario:' + mockFilePath + ':' + mockFeatureName + ':' + mockScenarioName1,
            children: { size: 0, forEach: sandbox.stub() }
        };

        // Create test run request
        const request = {
            include: [scenarioItem]
        };

        // Create cancellation token
        const token = { isCancellationRequested: false };

        // Make runTest throw an error
        const testError = new Error('Test execution failed');
        runTestStub.throws(testError);

        // Call the runHandler
        await (testControllerProvider as any).runHandler(request, token);

        // Verify test run was created
        assert.strictEqual(testControllerMock.createTestRun.calledOnce, true);

        // Verify test was started
        assert.strictEqual(testRunMock.started.called, true);

        // Verify runTest was called
        assert.strictEqual(runTestStub.called, true);

        // Verify test was marked as failed
        assert.strictEqual(testRunMock.failed.called, true);

        // Verify the error message was included
        const failedCall = testRunMock.failed.getCall(0);
        assert.strictEqual(failedCall.args[1].message, 'Failed to run test: ' + testError);

        // Verify test run was ended
        assert.strictEqual(testRunMock.end.calledOnce, true);
    });

    test('runHandler should run all tests when no items are specified', async () => {
        // Create test run request with no include
        const request = {};

        // Create cancellation token
        const token = { isCancellationRequested: false };

        // Call the runHandler
        await (testControllerProvider as any).runHandler(request, token);

        // Verify test run was created
        assert.strictEqual(testControllerMock.createTestRun.calledOnce, true);

        // Verify forEach was called on test items
        assert.strictEqual(testItemsMock.forEach.calledOnce, true);

        // Verify test run was ended
        assert.strictEqual(testRunMock.end.calledOnce, true);
    });

    test('dispose should clean up resources', () => {
        // Call dispose
        testControllerProvider.dispose();

        // Verify test controller was disposed
        assert.strictEqual(testControllerMock.dispose.calledOnce, true);
    });
});
