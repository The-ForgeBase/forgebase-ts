import { defineConfig } from 'tsup';
// import { cpSync } from 'fs';
// import { resolve } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'], // Both module formats
  dts: true, // Emit .d.ts files
  clean: true, // Clean dist before build
  target: 'es2020',
  splitting: false, // Recommended: false for lib
  shims: false,
  skipNodeModulesBundle: true,
  async onSuccess() {
    // const distDir = resolve(__dirname, '../../dist/libs/auth');
    // console.log('Copying package.json and README.md to dist...', distDir);
    // cpSync('libs/auth/package.json', `${distDir}/package.json`);
    // cpSync('libs/auth/README.md', `${distDir}/README.md`);
    // console.log('Copy complete.');
  },
});
