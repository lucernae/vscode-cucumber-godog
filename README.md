# VS Code Cucumber Godog Extension

This extension provides support for the [Godog](https://github.com/cucumber/godog) testing framework in Visual Studio Code, which is a Cucumber implementation for Go.

## Features

- Run Godog tests directly from VS Code
- Support for Cucumber feature files
- Integration with Go projects

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) (v6 or later)
- [Visual Studio Code](https://code.visualstudio.com/)

### Getting Started

1. Clone this repository
2. Run `npm install` to install dependencies
3. Open the project in VS Code

### Project Structure

- `package.json`: Extension manifest
- `src/index.ts`: Main extension entry point
- `src/test/`: Test files

## Development Workflow

### Building the Extension

```bash
npm run build
```

This will compile the TypeScript code to JavaScript in the `dist` directory.

### Watching for Changes

```bash
npm run watch
```

This will watch for changes in your TypeScript files and automatically compile them.

### Running the Extension

1. Press `F5` in VS Code to start a new window with your extension loaded
2. Run the command "Run Godog Test" from the Command Palette (Ctrl+Shift+P)

### Debugging the Extension

1. Set breakpoints in your TypeScript code
2. Press `F5` to start debugging
3. The debugger will stop at your breakpoints

### Running Tests

```bash
npm test
```

This will run the extension tests.

## Implementing Extension Features

### Adding Commands

1. Add a new command in the `contributes.commands` section of `package.json`
2. Register the command in the `activate` function in `src/index.ts`

Example:

```typescript
const disposable = vscode.commands.registerCommand('cucumber-godog.newCommand', () => {
    // Command implementation
});
context.subscriptions.push(disposable);
```

### Working with Godog

To implement Godog-specific functionality:

1. Use the child_process module to run Godog commands
2. Parse the output to provide feedback in VS Code
3. Consider using the VS Code task system for long-running tasks

Example:

```typescript
import * as cp from 'child_process';

// Run Godog in the current workspace
const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
const process = cp.spawn('godog', ['run'], { cwd: workspacePath });

// Create an output channel
const outputChannel = vscode.window.createOutputChannel('Godog');
outputChannel.show();

// Display output
process.stdout.on('data', (data) => {
    outputChannel.append(data.toString());
});
```

## Publishing the Extension

### Preparing for Publication

1. Update the `publisher` field in `package.json` with your publisher ID
2. Update the version number in `package.json`
3. Make sure you have a good README.md and icon

### Publishing to VS Code Marketplace

1. Install vsce: `npm install -g vsce`
2. Create a publisher on [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
3. Get a Personal Access Token (PAT) from Azure DevOps
4. Login with vsce: `vsce login <publisher>`
5. Package the extension: `vsce package`
6. Publish the extension: `vsce publish`

For more details, see the [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) guide.

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Godog Documentation](https://github.com/cucumber/godog)
- [Cucumber Documentation](https://cucumber.io/docs/cucumber/)

## License

[MIT](LICENSE)