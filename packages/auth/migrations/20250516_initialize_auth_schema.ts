import { Knex } from 'knex';
import { initializeAuthSchema } from '../src/config/schema.js';

export async function up(knex: Knex): Promise<void> {
  await initializeAuthSchema(knex, true);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema
    .dropTableIfExists('auth_admin_api_keys')
    .dropTableIfExists('auth_admin_audit_logs')
    .dropTableIfExists('auth_admin_sessions')
    .dropTableIfExists('auth_admins')
    .dropTableIfExists('auth_api_keys')
    .dropTableIfExists('auth_refresh_tokens')
    .dropTableIfExists('auth_access_tokens')
    .dropTableIfExists('auth_verification_tokens')
    .dropTableIfExists('auth_passwordless_tokens')
    .dropTableIfExists('auth_oauth_states')
    .dropTableIfExists('auth_oauth_providers')
    .dropTableIfExists('auth_sessions')
    .dropTableIfExists('auth_users')
    .dropTableIfExists('auth_crypto_keys')
    .dropTableIfExists('auth_config');
}
