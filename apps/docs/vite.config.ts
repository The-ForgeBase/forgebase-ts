/// <reference types="vitest" />

import analog from '@analogjs/platform';
import { defineConfig, Plugin } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    root: __dirname,
    cacheDir: `../../node_modules/.vite`,

    build: {
      outDir: '../../dist/apps/docs/client',
      reportCompressedSize: true,
      target: ['es2020'],
    },
    server: {
      fs: {
        allow: ['.'],
      },
    },
    optimizeDeps: {
      include: ['@ng-icons/core'],
    },
    ssr: {
      noExternal: ['@ng-icons/core'],
    },
    plugins: [
      analog({
        prerender: {
          routes: ['/'],
        },
        content: {
          prismOptions: {
            additionalLangs: ['prism-diff', 'mermaid'],
          },
        },
        vite: {
          experimental: {
            supportAnalogFormat: true,
          },
        },
      }),
      nxViteTsPaths(),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.spec.ts'],
      reporters: ['default'],
    },
    define: {
      'import.meta.vitest': mode !== 'production',
    },
  };
});
