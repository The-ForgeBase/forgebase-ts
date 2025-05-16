const { exec } = require('child_process');
exec('pnpx changeset version');
exec('pnpm install');
exec('pnpm turbo run build --filter=./packages/common');
exec('pnpm turbo run build --filter=./packages/database');
exec('pnpm turbo run build --filter=./packages/auth');
exec('pnpm turbo run build --filter=./packages/storage');
exec('pnpm turbo run build --filter=./packages/sdk');
