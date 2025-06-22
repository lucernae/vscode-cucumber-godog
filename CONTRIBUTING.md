# CONTRIBUTING

This is just a section for developers for a quick tips if you want to lear how this works.

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