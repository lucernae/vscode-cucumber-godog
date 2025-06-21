#!/bin/bash

# Test script to verify that the extension can be run from the CLI

echo "Testing CLI extension runner..."

# Make sure the script is executable
chmod +x run-extension.js

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run this script."
    exit 1
fi

# Check if the run-extension.js script exists
if [ ! -f "run-extension.js" ]; then
    echo "Error: run-extension.js script not found."
    exit 1
fi

# Check if package.json has the run-extension script
if ! grep -q "\"run-extension\":" package.json; then
    echo "Error: run-extension script not found in package.json."
    exit 1
fi

echo "All checks passed. The extension can be run from the CLI using:"
echo "  - ./run-extension.js"
echo "  - npm run run-extension"
echo "  - yarn run-extension"
echo ""
echo "To actually run the extension, use one of the commands above."
echo "Note: This test script only verifies that the setup is correct, it doesn't actually run the extension."

exit 0