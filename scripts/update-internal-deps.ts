// scripts/update-internal-deps.ts

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const NEW_VERSION = process.env.NEW_VERSION || '0.0.0-alpha.17';
const PKG_NAME = process.env.PKG_NAME || '@the-forgebase';
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

function updatePkgName(obj: Record<string, any> | undefined) {
  if (!obj) return;

  const updates: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('@forgebase-ts')) {
      const newKey = key.replace('@forgebase-ts', `${PKG_NAME}`);
      updates[newKey] = value;
      delete obj[key];
    }
  }

  Object.assign(obj, updates);
}

function processPackageJson(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);

  console.log(`Processing ${filePath}...`);

  updateDeps(json.dependencies);
  updateDeps(json.peerDependencies);
  updatePkgName(json.dependencies);
  updatePkgName(json.peerDependencies);

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
console.log('pkg name: ', PKG_NAME);
console.log('new version: ', NEW_VERSION);
