import fs from 'node:fs/promises';
import path from 'node:path';

async function copyFile(src: string, dest: string) {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    console.log(`✓ Created ${dest}`);
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error);
    throw error;
  }
}

async function initMigrations() {
  const targetDir = process.cwd();
  const sourceDir = path.resolve(__dirname, '..');

  // Copy knexfile.ts
  await copyFile(
    path.join(sourceDir, 'knexfile.ts'),
    path.join(targetDir, 'knexfile.ts'),
  );

  // Copy initial migration
  const migrationsDir = path.join(targetDir, 'migrations');
  await fs.mkdir(migrationsDir, { recursive: true });

  await copyFile(
    path.join(sourceDir, 'migrations', '20250516_initialize_auth_schema.ts'),
    path.join(migrationsDir, '20250516_initialize_auth_schema.ts'),
  );

  // Add migration scripts to package.json
  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));

  pkg.scripts = pkg.scripts || {};
  pkg.scripts['migrate'] =
    'tsx node_modules/@the-forgebase/auth/scripts/migrate.ts';
  pkg.scripts['migrate:make'] =
    'tsx node_modules/@the-forgebase/auth/scripts/make-migration.ts';
  pkg.scripts['migrate:rollback'] =
    'tsx node_modules/@the-forgebase/auth/scripts/rollback.ts';

  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('✓ Updated package.json with migration scripts');

  console.log('\nMigration setup complete! Next steps:');
  console.log('1. Update knexfile.ts with your database configuration');
  console.log('2. Run migrations with: pnpm migrate');
}

initMigrations().catch(console.error);
