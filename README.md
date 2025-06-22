# Cucumber Godog Extension for VS Code [![Version](https://img.shields.io/visual-studio-marketplace/v/lucernae.cucumber-godog)](https://marketplace.visualstudio.com/items?itemName=lucernae.cucumber-godog) [![Installs](https://img.shields.io/visual-studio-marketplace/i/lucernae.cucumber-godog)](https://marketplace.visualstudio.com/items?itemName=lucernae.cucumber-godog)

This extension provides support for Cucumber/Gherkin `.feature` files and integrates with Go's [Godog](https://github.com/cucumber/godog) BDD testing framework.

## Features

- **Run Tests Directly from Feature Files**: Run buttons appear next to Feature and Scenario definitions
- **Command Palette Integration**: Run tests for specific features or scenarios from the command palette

### Recommended file structures/tree

The extension will find feature files `*.feature` and then execute go test on the directory one level above.
So, if you have package called `godogs`, it is best to organize the tests like this:

```
godogs
- features
  - godogs.feature
- go.mod
- go.sum
- godogs_test.go
```

Godog normally only run tests by Scenario name.
In order for go test to also pick up the Feature name, you can organize your test function like this:

```go
func TestFeatures(t *testing.T) {
	suiteParser := godog.TestSuite{
		Options: &godog.Options{
			Paths: []string{"features"},
		},
	}
	features, err := suiteParser.RetrieveFeatures()
	if err != nil {
		t.Fatalf("failed to retrieve features: %v", err)
	}
	for _, feature := range features {
		t.Run(feature.Feature.Name, func(t *testing.T) {
			suite := godog.TestSuite{
				ScenarioInitializer: InitializeScenario,
				Options: &godog.Options{
					Format: "pretty",
					FeatureContents: []godog.Feature{
						{
							Name:     feature.Feature.Name,
							Contents: feature.Content,
						},
					},
					TestingT: t, // Testing instance that will run subtests.
				},
			}

			if suite.Run() != 0 {
				t.Fatal("non-zero status returned, failed to run feature tests")
			}
		})
	}
}
```

This allows Go test to associate each test case with the pattern name: `TestFunction/FeatureName/ScenarioName`.

### Run Tests from Feature Files

The extension provides multiple ways to run tests directly from your `.feature` files:

#### CodeLens Buttons
- Click the "▶ Run Feature" button above a Feature definition to run all scenarios in that feature
- Click the "▶ Run Scenario" button above a Scenario or Scenario Outline definition to run just that scenario

#### Gutter Icons
- Click the run icon in the gutter (next to the line number) to run a feature or scenario
- These icons appear next to Feature and Scenario definitions

#### Test Explorer
- Use VS Code's built-in Test Explorer to view and run your Cucumber tests
- Features and scenarios appear in a hierarchical tree view
- Run individual scenarios or entire features with a single click

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

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## For more information

* [Godog GitHub Repository](https://github.com/cucumber/godog)
* [Cucumber Documentation](https://cucumber.io/docs/cucumber/)
* [VS Code Extension API](https://code.visualstudio.com/api)

## Funding

This small extension was made in my spare time.
If you want, you can show support via GitHub sponsor: https://github.com/lucernae/vscode-cucumber-godog

**Enjoy!**
