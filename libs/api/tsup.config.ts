import { defineConfig } from 'tsup';
import { cpSync, existsSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  entry: [
    'libs/api/src/index.ts',
    'libs/api/src/frameworks/index.ts',
    'libs/api/src/frameworks/nest/index.ts',
    'libs/api/src/core/nest/index.ts',
    'libs/api/src/core/hono/index.ts',
    'libs/api/src/core/web/index.ts',
    'libs/api/src/core/express/index.ts',
    'libs/api/src/core/index.ts',
  ],
  format: ['esm', 'cjs'], // Both module formats
  dts: true, // Emit .d.ts files
  outDir: 'dist/libs/api/src',
  sourcemap: true,
  clean: true, // Clean dist before build
  target: 'es2020',
  splitting: false, // Recommended: false for lib
  shims: false,
  // skipNodeModulesBundle: true,
  bundle: true,
  async onSuccess() {
    const distDir = resolve(__dirname, '../../dist/libs/api');
    console.log('Copying package.json and README.md to dist...', distDir);
    cpSync('libs/api/package.json', `${distDir}/package.json`);
    if (existsSync('libs/api/README.md')) {
      cpSync('libs/api/README.md', `${distDir}/README.md`);
    }
    console.log('Copy complete.');
  },
});
