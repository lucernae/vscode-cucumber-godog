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
3. Test output is displayed in the "Cucumber Godog" output channel

## Known Issues

- The extension assumes that your Go tests are set up to run Godog tests with the standard naming patterns
- Test patterns are based on the feature and scenario names, which must match the test names in your Go code

## Release Notes

### 0.0.1

Initial release with:
- Syntax highlighting for `.feature` files
- Run buttons for features and scenarios
- Command palette integration

---

## For more information

* [Godog GitHub Repository](https://github.com/cucumber/godog)
* [Cucumber Documentation](https://cucumber.io/docs/cucumber/)

**Enjoy!**
