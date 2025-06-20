import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Cucumber Godog extension is now active!');

    // Register the command that was defined in package.json
    const disposable = vscode.commands.registerCommand('cucumber-godog.runTest', () => {
        // The code you place here will be executed every time your command is executed
        vscode.window.showInformationMessage('Running Godog tests!');

        // Here you would implement the actual logic to run Godog tests
        // For example, you might:
        // 1. Get the current file or workspace folder
        // 2. Check if it's a Go project with Godog tests
        // 3. Execute the Godog command using child_process
        // 4. Display the results in the output channel
    });

    // Add the command to the extension context's subscriptions
    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Cucumber Godog extension is now deactivated!');
}
