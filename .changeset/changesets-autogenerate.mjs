import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Get the most recent commit message
const commitMessage = execSync('git log -1 --format=%s').toString().trim();

// Define valid scopes (based on your packages)
const validScopes = ['auth', 'api', 'common', 'database', 'storage', 'sdk'];

// Define regex patterns
const commitPatterns = {
  breaking: /^BREAKING[\s-]CHANGE: (.+)/,
  feature: /^feat(?:\(([^)]+)\))?: (.+)/,
  fix: /^fix(?:\(([^)]+)\))?: (.+)/,
  chore: /^chore(?:\(([^)]+)\))?: (.+)/,
};

// Helper to get package version
function getCurrentVersion(packageName) {
  try {
    const pkgPath = path.join(
      process.cwd(),
      'packages',
      packageName,
      'package.json',
    );
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version;
  } catch (e) {
    return '0.0.0-alpha.0';
  }
}

// Helper to increment alpha version
function incrementAlphaVersion(version) {
  const match = version.match(/^(\d+\.\d+\.\d+)-alpha\.(\d+)$/);
  if (match) {
    return `${match[1]}-alpha.${parseInt(match[2]) + 1}`;
  }
  return '0.0.0-alpha.0';
}

// Identify type, package, and description
let packageName = null;
let changeType = null;
let description = null;

if (commitPatterns.breaking.test(commitMessage)) {
  changeType = 'major';
  description = commitMessage.match(commitPatterns.breaking)?.[1];
} else if (commitPatterns.feature.test(commitMessage)) {
  const scope = commitMessage.match(commitPatterns.feature)?.[1];
  if (validScopes.includes(scope)) {
    changeType = 'minor';
    packageName = scope;
    description = commitMessage.match(commitPatterns.feature)?.[2];
  }
} else if (commitPatterns.fix.test(commitMessage)) {
  const scope = commitMessage.match(commitPatterns.fix)?.[1];
  if (validScopes.includes(scope)) {
    changeType = 'patch';
    packageName = scope;
    description = commitMessage.match(commitPatterns.fix)?.[2];
  }
} else if (commitPatterns.chore.test(commitMessage)) {
  const scope = commitMessage.match(commitPatterns.chore)?.[1];
  if (validScopes.includes(scope)) {
    changeType = 'patch';
    packageName = scope;
    description = commitMessage.match(commitPatterns.chore)?.[2];
  }
}

// If we have identified a change, create a changeset
if (changeType && packageName && description) {
  const currentVersion = getCurrentVersion(packageName);
  const nextVersion = incrementAlphaVersion(currentVersion);

  // Create changeset filename with timestamp
  const timestamp = new Date().getTime();
  const changesetPath = path.join(
    process.cwd(),
    '.changeset',
    `${timestamp}.md`,
  );

  // Create changeset content
  const changesetContent = `---
"@the-forgebase/${packageName}": ${nextVersion}
---

${description}
`;

  // Write changeset file
  fs.writeFileSync(changesetPath, changesetContent);
  console.log(`Created changeset for @the-forgebase/${packageName}`);
} else {
  console.log('No valid changeset could be generated from the commit message.');
  console.log('Commit message format should be one of:');
  console.log('- BREAKING CHANGE: <description>');
  console.log('- feat(<package>): <description>');
  console.log('- fix(<package>): <description>');
  console.log('- chore(<package>): <description>');
  console.log('\nValid packages are:', validScopes.join(', '));
  process.exit(1);
}

if (packageName) {
  packageName = packageName.trim();
  description = description?.trim() || 'No description provided.';

  const changesetContent = `---
'@the-forgebase/${packageName}': ${changeType}
---
${description}
`;

  fs.writeFileSync(`.changeset/auto-${Date.now()}.md`, changesetContent);
  console.log(
    `✅ Changeset file created for package: @the-forgebase/${packageName}`,
  );
} else {
  console.log(
    '⚠️ No valid package scope found in commit message. Valid scopes are: auth, api, common, database, storage, sdk',
  );
}
