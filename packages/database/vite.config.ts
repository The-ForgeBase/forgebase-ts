import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es', 'cjs'] },
    rollupOptions: {
      external: [
        'events', // Node.js built-in modules
        'lodash.flatten',
        'lodash.flatten/index.js',
      ],
    },
  },
  define: {
    // Define Node.js-specific global variables like `global`, `process`, etc.
    global: 'globalThis',
    process: 'process',
  },
  resolve: { alias: { src: resolve('src/') } },
  plugins: [dts()],
});
