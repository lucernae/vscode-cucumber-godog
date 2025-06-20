import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import { runTest } from '../../../services/testService';
import * as stringUtils from '../../../utils/stringUtils';

suite('TestService Test Suite', () => {
	let sandbox: sinon.SinonSandbox;
	let outputChannelStub: sinon.SinonStub;
	let terminalStub: sinon.SinonStub;
	let configStub: sinon.SinonStub;
	let showTerminalStub: sinon.SinonStub;
	let sendTextStub: sinon.SinonStub;
	let terminalMock: any;
	let windowStub: sinon.SinonStub;

	setup(() => {
		sandbox = sinon.createSandbox();

		// Create stubs for vscode APIs
		outputChannelStub = sandbox.stub(vscode.window, 'createOutputChannel').returns({
			appendLine: () => {},
			dispose: () => {}
		} as any);

		// Create terminal mock
		terminalMock = {
			show: () => {},
			sendText: () => {}
		};
		showTerminalStub = sandbox.stub(terminalMock, 'show');
		sendTextStub = sandbox.stub(terminalMock, 'sendText');

		// Stub terminal creation
		terminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(terminalMock);

		// Stub window.terminals
		windowStub = sandbox.stub(vscode.window, 'terminals').value([]);

		// Stub configuration
		configStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns({
			get: (key: string, defaultValue: any) => {
				switch (key) {
					case 'program':
						return 'go';
					case 'programArgument':
						return 'test -v .';
					case 'programWorkingDirectory':
						return '../';
					case 'testPatternFormat':
						return '/${sanitizedFeatureName}/${sanitizedScenarioName}$';
					default:
						return defaultValue;
				}
			}
		} as any);

		// Stub sanitizeName
		sandbox.stub(stringUtils, 'sanitizeName').callsFake((name) => name.replace(/[^a-zA-Z0-9]/g, '_'));
	});

	teardown(() => {
		sandbox.restore();
	});

	test('runTest should create a terminal with the correct parameters', () => {
		const filePath = '/path/to/feature/file.feature';
		const featureName = 'Test Feature';
		const scenarioName = 'Test Scenario';

		runTest(filePath, featureName, scenarioName);

		// Verify output channel was created
		assert.strictEqual(outputChannelStub.calledOnce, true);

		// Verify terminal was created with correct parameters
		assert.strictEqual(terminalStub.calledOnce, true);

		// Get the terminal options or empty object if not available
		const terminalOptions = terminalStub.firstCall?.args?.[0] ?? {};
		assert.strictEqual(terminalOptions.name, 'Cucumber Godog: /Test_Feature/Test_Scenario$');
		assert.strictEqual(terminalOptions.cwd, path.resolve('/path/to/feature', '../'));
		assert.deepStrictEqual(terminalOptions.env, {
			FORCE_COLOR: '1',
			COLORTERM: 'truecolor',
			TERM: 'xterm-256color',
			GO_TEST_COLOR: '1'
		});

		// Verify terminal was shown
		assert.strictEqual(showTerminalStub.calledOnce, true);

		// Verify command was sent to terminal
		assert.strictEqual(sendTextStub.calledOnce, true);

		// Get the first argument or empty string if not available
		const firstArg = sendTextStub.firstCall?.args?.[0] ?? '';
		assert.strictEqual(firstArg, 'go test -v . -run "/Test_Feature/Test_Scenario$"');
	});

	test('runTest should reuse existing terminal if available', () => {
		const filePath = '/path/to/feature/file.feature';
		const featureName = 'Test Feature';

		// Set up an existing terminal
		const existingTerminal = {
			name: 'Cucumber Godog: /Test_Feature/$',
			show: () => {},
			sendText: () => {}
		};
		const existingShowStub = sandbox.stub(existingTerminal, 'show');
		const existingSendTextStub = sandbox.stub(existingTerminal, 'sendText');

		windowStub.value([existingTerminal]);

		runTest(filePath, featureName);

		// Verify terminal was not created
		assert.strictEqual(terminalStub.called, false);

		// Verify existing terminal was used
		assert.strictEqual(existingShowStub.calledOnce, true);
		assert.strictEqual(existingSendTextStub.calledOnce, true);

		// Use type assertion to tell TypeScript that args is not empty
		const args = existingSendTextStub.firstCall?.args as string[];
		assert.strictEqual(args?.[0], 'go test -v . -run "/Test_Feature/$"');
	});

	test('runTest should handle feature name only', () => {
		const filePath = '/path/to/feature/file.feature';
		const featureName = 'Test Feature';

		runTest(filePath, featureName);

		// Verify terminal was created with correct name
		assert.strictEqual(terminalStub.calledOnce, true);

		// Get the terminal options or empty object if not available
		const terminalOptions = terminalStub.firstCall?.args?.[0] ?? {};
		assert.strictEqual(terminalOptions.name, 'Cucumber Godog: /Test_Feature/$');

		// Verify command was sent to terminal
		assert.strictEqual(sendTextStub.calledOnce, true);

		// Get the first argument or empty string if not available
		const firstArg = sendTextStub.firstCall?.args?.[0] ?? '';
		assert.strictEqual(firstArg, 'go test -v . -run "/Test_Feature/$"');
	});

	test('runTest should handle scenario name only', () => {
		const filePath = '/path/to/feature/file.feature';
		const scenarioName = 'Test Scenario';

		runTest(filePath, undefined, scenarioName);

		// Verify terminal was created with correct name
		assert.strictEqual(terminalStub.calledOnce, true);

		// Get the terminal options or empty object if not available
		const terminalOptions = terminalStub.firstCall?.args?.[0] ?? {};
		assert.strictEqual(terminalOptions.name, 'Cucumber Godog: //Test_Scenario$');

		// Verify command was sent to terminal
		assert.strictEqual(sendTextStub.calledOnce, true);

		// Get the first argument or empty string if not available
		const firstArg = sendTextStub.firstCall?.args?.[0] ?? '';
		assert.strictEqual(firstArg, 'go test -v . -run "//Test_Scenario$"');
	});
});
