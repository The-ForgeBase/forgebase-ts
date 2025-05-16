import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/adapters/nest/index',
    'src/adapters/web/index',
    'src/adapters/express/index',
    'src/adapters/ultimate-express/index',
  ],
  declaration: true,
  clean: true,
  //   rootDir: './src',
  //   outDir: './dist',
  sourcemap: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: false,
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
        },
      },
    },
  },
});
