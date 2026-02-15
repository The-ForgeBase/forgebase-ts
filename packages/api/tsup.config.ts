import { defineConfig } from 'tsup';

export default defineConfig([
  // Main package build
  {
    entry: ['src/index.ts', 'src/core/index.ts', 'src/core/nest/index.ts'],
    format: ['esm', 'cjs'],
    sourcemap: false,
    dts: true,
    clean: true,
    splitting: false,
    outDir: 'dist',
    tsconfig: './tsconfig.json',
  },
]);
