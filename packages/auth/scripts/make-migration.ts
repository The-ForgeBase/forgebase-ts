import path from 'node:path';
import fs from 'node:fs/promises';

async function makeMigration() {
  const name = process.argv[2];
  if (!name) {
    console.error('Please provide a migration name');
    console.error('Usage: pnpm migrate:make migration_name');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const filename = `${timestamp}_${name}.ts`;

  const template = `import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add migration code here
}

export async function down(knex: Knex): Promise<void> {
  // Add rollback code here
}
`;

  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    await fs.mkdir(migrationsDir, { recursive: true });

    const filePath = path.join(migrationsDir, filename);
    await fs.writeFile(filePath, template);

    console.log(`Created migration: ${filename}`);
  } catch (error) {
    console.error('Error creating migration:', error);
    process.exit(1);
  }
}

makeMigration().catch(console.error);
