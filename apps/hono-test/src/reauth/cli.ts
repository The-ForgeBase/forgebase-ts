import { ReAuthEngine } from '@the-forgebase/reauth';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

// Step 1: Build the absolute path to the deeply nested Auth file
const authFile = path.resolve(__dirname, './auth.ts');

(async () => {
  // Step 2: Import the Auth file
  const module = await import(authFile);
  const authInstance = module.default;

  if (!authInstance || !(authInstance instanceof ReAuthEngine)) {
    throw new Error('Default export is not an instance of ReAuthEngine.');
  }

  // Step 2: Deep object access (just getting the whole config)
  const config = authInstance.getMirgrationCongfig();

  if (!config) {
    throw new Error('No valid config found on default export.');
  }

  // Optional: Validate keys or prune if needed later

  // Step 3: Write the config to a file
  const outputPath = path.resolve(__dirname, './extracted-config.json');
  writeFileSync(outputPath, JSON.stringify(config, null, 2));

  console.log(`Config extracted to: ${outputPath}`);
})();
