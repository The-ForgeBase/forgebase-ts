import { defineConfig } from 'tsup';

export default defineConfig([
  // Main package build
  {
    entry: [
      'src/index.ts',
      'src/database/server/index.ts',
      'src/database/client/index.ts',
    ],
    format: ['esm', 'cjs'],
    sourcemap: false,
    dts: true,
    clean: true,
    splitting: false,
    outDir: 'dist',
    tsconfig: './tsconfig.json',
  },
]);
