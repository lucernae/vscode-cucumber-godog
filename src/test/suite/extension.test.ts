import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('lucernae.vscode-cucumber-godog'));
  });

  test('Should register commands', async () => {
    // Get the list of all registered commands
    const commands = await vscode.commands.getCommands();
    
    // Check if our command is registered
    assert.ok(commands.includes('cucumber-godog.runTest'));
  });
});