#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the extension's root directory
const extensionPath = __dirname;

// Determine the VSCode executable path based on the platform
let vscodePath;
if (process.platform === 'darwin') {
  // macOS
  vscodePath = require('child_process').execSync('command -v code || which code', {encoding: 'utf8'}).trim();
} else if (process.platform === 'win32') {
  // Windows
  vscodePath = 'C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd';
} else {
  // Linux and others
  vscodePath = '/usr/bin/code';
}

// Check if the VSCode executable exists
if (!fs.existsSync(vscodePath)) {
  console.error(`VSCode executable not found at ${vscodePath}`);
  console.error('Please install VSCode or update the path in this script.');
  process.exit(1);
}

// Build the command arguments
const args = [
  '--extensionDevelopmentPath=' + extensionPath,
  // You can add more arguments here if needed
];

console.log(`Launching extension from ${extensionPath}`);
console.log(`Using VSCode at ${vscodePath}`);
console.log(`Command: ${vscodePath} ${args.join(' ')}`);

// Launch VSCode with the extension
const vscode = spawn(vscodePath, args, {
  stdio: 'inherit',
  detached: false
});

vscode.on('error', (err) => {
  console.error('Failed to start VSCode:', err);
  process.exit(1);
});

vscode.on('close', (code) => {
  console.log(`VSCode exited with code ${code}`);
  process.exit(code);
});