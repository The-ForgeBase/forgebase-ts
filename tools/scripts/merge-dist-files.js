/**
 * This script copies all files from dist/libs/{name}/libs/{name} to dist/libs/{name}
 * and then deletes the dist/libs/{name}/libs folder.
 *
 * Usage: node tools/scripts/merge-dist-files.js {name}
 * Example: node tools/scripts/merge-dist-files.js auth
 */

const fs = require('fs');
const path = require('path');

// Get the library name from command line arguments
const libName = process.argv[2];

if (!libName) {
  console.error('Error: Library name is required');
  console.error('Usage: node tools/scripts/merge-dist-files.js {name}');
  process.exit(1);
}

// Define paths
const sourceDir = path.join(
  process.cwd(),
  'dist',
  'libs',
  libName,
  'libs',
  libName
);
const targetDir = path.join(process.cwd(), 'dist', 'libs', libName);
const libsDir = path.join(process.cwd(), 'dist', 'libs', libName, 'libs');

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
  console.log(
    `Source directory ${sourceDir} does not exist. Nothing to merge.`
  );
  process.exit(0);
}

/**
 * Recursively copy files from source to target
 * @param {string} source - Source directory
 * @param {string} target - Target directory
 */
function copyRecursive(source, target) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  // Copy each entry
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyRecursive(sourcePath, targetPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
      // console.log(`Copied: ${sourcePath} -> ${targetPath}`);
    }
  }
}

// Main execution
try {
  // console.log(`Merging files from ${sourceDir} to ${targetDir}...`);

  // Copy files recursively
  copyRecursive(sourceDir, targetDir);

  // Delete the libs directory
  if (fs.existsSync(libsDir)) {
    fs.rmSync(libsDir, { recursive: true, force: true });
    console.log(`Deleted: ${libsDir}`);
  }

  console.log('Merge completed successfully!');
} catch (error) {
  console.error('Error during merge process:', error);
  process.exit(1);
}
