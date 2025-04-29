// scripts/update-internal-deps.ts

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const NEW_VERSION = process.env.NEW_VERSION || '0.0.0-alpha.17';
const PACKAGES_TO_UPDATE = [
  '@forgebase-ts/auth',
  '@forgebase-ts/common',
  '@forgebase-ts/database',
  '@forgebase-ts/real-time',
  '@forgebase-ts/storage',
  '@forgebase-ts/sdk',
  '@forgebase-ts/api',
  '@forgebase-ts/web-auth',
  '@forgebase-ts/react-native-auth',
];

function updateDeps(obj: Record<string, any> | undefined) {
  if (!obj) return;
  for (const depName of Object.keys(obj)) {
    if (PACKAGES_TO_UPDATE.includes(depName)) {
      obj[depName] = NEW_VERSION;
    }
  }
}

function processPackageJson(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);

  console.log(`Processing ${filePath}...`);

  updateDeps(json.dependencies);
  updateDeps(json.peerDependencies);

  writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
}

function findPackageJsons(dir: string) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      findPackageJsons(fullPath);
    } else if (entry === 'package.json') {
      processPackageJson(fullPath);
    }
  }
}

// Start
findPackageJsons('./libs');
console.log('Done updating internal dependencies.');
