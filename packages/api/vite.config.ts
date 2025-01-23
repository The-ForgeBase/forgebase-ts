import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import nodeExternals from 'vite-plugin-node-externals';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es', 'cjs'] },
    target: 'node16',
    minify: false,
  },
  define: {
    // Define Node.js-specific global variables like `global`, `process`, etc.
    global: 'globalThis',
    process: 'process',
  },
  resolve: { alias: { src: resolve('src/') } },
  plugins: [dts(), nodeExternals()],
});
