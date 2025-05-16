const { exec } = require('child_process');
exec('pnpx changeset version');
exec('pnpm install');
