import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Discover all .yaml test files in a folder (recursive)
 */
export function discoverTests(folderPath: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath); // recurse
      } else if (stat.isFile() && (extname(entry) === '.yaml' || extname(entry) === '.yml')) {
        results.push(fullPath);
      }
    }
  }

  walk(folderPath);
  return results.sort(); // consistent order
}

/**
 * Check if path is a file or folder
 */
export function isFolder(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}