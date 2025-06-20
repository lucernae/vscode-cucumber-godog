/**
 * Sanitizes a name by replacing non-alphanumeric characters with underscores
 * @param name The name to sanitize
 * @returns The sanitized name
 */
export function sanitizeName(name: string): string {
	return name.replace(/[^a-zA-Z0-9]/g, '_');
}