const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/nest-test'),
    chunkFormat: 'commonjs',
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
  // Removed outputModule experiment to ensure CommonJS compatibility
  externalsPresets: { node: true },
  externals: [
    function ({ request }, callback) {
      // Handle @oslojs packages as external and mark them to be imported as ESM
      if (/^@oslojs\/.*$/.test(request)) {
        return callback(null, `module ${request}`);
      }
      callback();
    },
  ],
};
