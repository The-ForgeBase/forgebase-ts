import { defineConfig } from 'tsup';
import { cpSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  entry: ['libs/auth/src/**/*.ts', 'libs/auth/src/**/*.tsx'],
  format: ['esm', 'cjs'], // Both module formats
  dts: false, // Emit .d.ts files
  outDir: 'dist/libs/auth/src',
  sourcemap: true,
  clean: true, // Clean dist before build
  target: 'es2020',
  splitting: false, // Recommended: false for lib
  shims: false,
  skipNodeModulesBundle: true,
  bundle: false,
  async onSuccess() {
    const distDir = resolve(__dirname, '../../dist/libs/auth');
    console.log('Copying package.json and README.md to dist...', distDir);
    cpSync('libs/auth/package.json', `${distDir}/package.json`);
    cpSync('libs/auth/README.md', `${distDir}/README.md`);
    console.log('Copy complete.');
  },
});
