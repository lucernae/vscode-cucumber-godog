# Cucumber Godog Extension for VS Code

This extension provides support for Cucumber/Gherkin `.feature` files and integrates with Go's Godog BDD testing framework.

## Features

- **Syntax Highlighting**: Full syntax highlighting for Gherkin/Cucumber `.feature` files
- **Run Tests Directly from Feature Files**: Run buttons appear next to Feature and Scenario definitions
- **Command Palette Integration**: Run tests for specific features or scenarios from the command palette

### Run Tests from Feature Files

The extension adds run buttons directly in your `.feature` files:

- Click the "▶ Run Feature" button next to a Feature definition to run all scenarios in that feature
- Click the "▶ Run Scenario" button next to a Scenario or Scenario Outline definition to run just that scenario

![Run Feature and Scenario buttons](images/run-buttons.png)

### Command Palette Commands

The extension adds the following commands to the VS Code command palette:

- **Cucumber: Run Feature** - Run the current feature file
- **Cucumber: Run Scenario** - Run the scenario at the current cursor position

## Requirements

- Visual Studio Code v1.101.0 or higher
- Go installed on your system
- Godog tests in your project

## How It Works

When you run a feature or scenario:

1. The extension executes `go test` in the directory containing the feature file
2. It passes the appropriate test pattern to run just the selected feature or scenario
3. Test output is displayed in the "Cucumber Godog" terminal

## Configuration

You can customize how the extension runs tests through VS Code settings. The following settings are available:

### `cucumber-godog.program`

The program to execute (default: `go`).

Example: `"cucumber-godog.program": "go"`

### `cucumber-godog.programArgument`

The arguments to pass to the program (default: `test -v .`).

Example: `"cucumber-godog.programArgument": "test -v -count=1 ."`

### `cucumber-godog.programWorkingDirectory`

The working directory for the program, relative to the feature file (default: `../`).

Example: `"cucumber-godog.programWorkingDirectory": "../../"`

### `cucumber-godog.testPatternFormat`

The format of the test pattern used to filter tests (default: `/${featureName}/${scenarioName}$`).

You can use the following variables in your test pattern format:

- `${featureName}` - The name of the feature
- `${scenarioName}` - The name of the scenario
- `${sanitizedFeatureName}` - The sanitized name of the feature (non-alphanumeric characters replaced with underscores)
- `${sanitizedScenarioName}` - The sanitized name of the scenario (non-alphanumeric characters replaced with underscores)
- `${featureFilePath}` - The full path to the feature file

Example: `"cucumber-godog.testPatternFormat": "^${sanitizedFeatureName}_${sanitizedScenarioName}$"`

## Known Issues

- The extension assumes that your Go tests are set up to run Godog tests with the standard naming patterns
- Test patterns are based on the feature and scenario names, which must match the test names in your Go code

## Release Notes

### 0.0.2

- Added configuration options for customizing test execution
- Added variable substitution in test pattern format
- Improved terminal output with proper quoting of test patterns

### 0.0.1

Initial release with:
- Syntax highlighting for `.feature` files
- Run buttons for features and scenarios
- Command palette integration

---

## Running the Extension from CLI

You can run the extension directly from the command line without opening VS Code's UI. This is useful for:

- Testing the extension in a headless environment
- Running the extension in CI/CD pipelines
- Automating extension development workflows

### Using npm/yarn

```bash
# Using npm
npm run run-extension

# Using yarn
yarn run-extension
```

### Verifying the setup

You can verify that the CLI extension runner is set up correctly by running:

```bash
# Using npm
npm run test-cli

# Using yarn
yarn test-cli

# Or directly
./test-cli-extension.sh
```

This will check that all the necessary components are in place without actually launching the extension.

### Using the script directly

```bash
# Make sure the script is executable
chmod +x run-extension.js

# Run the script
./run-extension.js
```

The script will:
1. Detect your VS Code installation location
2. Launch VS Code with the extension in development mode
3. Display logs in the terminal

### Customizing the script

You can modify the `run-extension.js` file to customize how the extension is launched:

- Change the VS Code executable path if it's installed in a non-standard location
- Add additional command-line arguments
- Configure environment variables

## For more information

* [Godog GitHub Repository](https://github.com/cucumber/godog)
* [Cucumber Documentation](https://cucumber.io/docs/cucumber/)
* [VS Code Extension API](https://code.visualstudio.com/api)

**Enjoy!**
