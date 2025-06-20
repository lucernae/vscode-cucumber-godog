import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';
import { promisify } from 'util';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');
	const globPromise = promisify(glob);

	return new Promise<void>((resolve, reject) => {
		globPromise('**/**.test.js', { cwd: testsRoot })
			.then((files) => {
				// Cast the unknown files to string[]
				const testFiles = files as string[];
				// Add files to the test suite
				testFiles.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

				try {
					// Run the mocha test
					mocha.run((failures: number) => {
						if (failures > 0) {
							reject(new Error(`${failures} tests failed.`));
						} else {
							resolve();
						}
					});
				} catch (err) {
					console.error(err);
					reject(err);
				}
			})
			.catch((err: Error) => {
				reject(err);
			});
	});
}
