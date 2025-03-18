import { Knex } from 'knex';
import { AuthConfig } from '../types';

export async function initializeAuthSchema(knex: Knex, config?: AuthConfig) {
  // Auth Config Table
  console.log('Initializing auth schema...');
  const hasAuthConfig = await knex.schema.hasTable('auth_config');
  if (!hasAuthConfig) {
    await knex.schema.createTable('auth_config', (table) => {
      table.increments('id');
      table.json('config').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // OAuth Providers Table
  const hasAuthProviders = await knex.schema.hasTable('oauth_providers');
  if (!hasAuthProviders) {
    await knex.schema.createTable('oauth_providers', (table) => {
      table.increments('id');
      table.string('name').notNullable().unique();
      table.json('config').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // Users Table
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) {
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('email').unique().index();
      table.string('phone').unique().nullable();
      table.string('name').nullable();
      table.string('picture').nullable();
      table.string('password_hash').nullable();
      table.boolean('email_verified').defaultTo(false);
      table.boolean('phone_verified').defaultTo(false);
      table.boolean('mfa_enabled').defaultTo(false);
      table.string('mfa_secret').nullable();
      table.json('mfa_recovery_codes').nullable();
      table.timestamp('last_login_at').nullable();
      table.timestamps(true, true);

      // Indexes for performance
      table.index(['email_verified']);
      table.index(['phone_verified']);
      table.index(['mfa_enabled']);
    });
    console.log('Users table created');
  }

  // OAuth Accounts Table
  const hasOAuthAccounts = await knex.schema.hasTable('oauth_accounts');
  if (!hasOAuthAccounts) {
    await knex.schema.createTable('oauth_accounts', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('provider').notNullable();
      table.string('provider_user_id').notNullable();
      table.json('provider_data').nullable();
      table.timestamps(true, true);

      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      // Composite unique constraint
      table.unique(['provider', 'provider_user_id']);
      // Index for faster lookups
      table.index(['user_id']);
    });
  }

  // Sessions Table
  const hasSessions = await knex.schema.hasTable('sessions');
  if (!hasSessions) {
    await knex.schema.createTable('sessions', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').unique();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);

      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['expires_at']);
    });
  }

  // Verification Tokens Table (for email/phone verification and password reset)
  const hasVerificationTokens = await knex.schema.hasTable(
    'verification_tokens'
  );
  if (!hasVerificationTokens) {
    await knex.schema.createTable('verification_tokens', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').notNullable();
      table.string('type').notNullable(); // 'email', 'phone', 'password_reset'
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);

      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['token']);
      table.index(['type']);
      table.index(['expires_at']);
    });
  }

  //Access Tokens Table
  const hasAccessTokens = await knex.schema.hasTable('access_tokens');
  if (!hasAccessTokens) {
    await knex.schema.createTable('access_tokens', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['token']);
      table.index(['expires_at']);
    });
  }

  //Refresh Tokens Table
  const hasRefreshTokens = await knex.schema.hasTable('refresh_tokens');
  if (!hasRefreshTokens) {
    await knex.schema.createTable('refresh_tokens', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['token']);
      table.index(['expires_at']);
    });
  }

  // API Keys Table
  const hasApiKeys = await knex.schema.hasTable('api_keys');
  if (!hasApiKeys) {
    await knex.schema.createTable('api_keys', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('key_prefix').notNullable();
      table.string('key_hash').notNullable();
      table.string('name').notNullable();
      table.json('scopes').nullable();
      table.timestamp('expires_at').nullable();
      table.timestamp('last_used_at').nullable();
      table.timestamps(true, true);

      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');

      // Composite index for faster lookups
      table.unique(['key_prefix', 'key_hash']);

      // Indexes for performance
      table.index(['user_id']);
      table.index(['key_prefix']);
      table.index(['expires_at']);
    });
  }

  // Only create admin tables if admin feature is enabled
  if (config?.adminFeature?.enabled) {
    await initializeAdminTables(knex);
  }
}

/**
 * Initialize admin-specific database tables
 */
export async function initializeAdminTables(knex: Knex): Promise<void> {
  // Admins Table
  const hasAdmins = await knex.schema.hasTable('internal_admins');
  if (!hasAdmins) {
    await knex.schema.createTable('internal_admins', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('email').unique().notNullable().index();
      table.string('name').nullable();
      table.string('password_hash').notNullable();
      table.string('role').defaultTo('admin').notNullable();
      table.json('permissions').nullable();
      table.boolean('is_super_admin').defaultTo(false);
      table.timestamp('last_login_at').nullable();
      table.timestamps(true, true);
    });
  }

  // Admin Sessions Table
  const hasAdminSessions = await knex.schema.hasTable(
    'internal_admin_sessions'
  );
  if (!hasAdminSessions) {
    await knex.schema.createTable('internal_admin_sessions', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('admin_id').notNullable();
      table.string('token').unique().notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);

      // Foreign key to admins table
      table
        .foreign('admin_id')
        .references('id')
        .inTable('internal_admins')
        .onDelete('CASCADE');

      // Indexes for performance
      table.index(['admin_id']);
      table.index(['expires_at']);
    });
  }

  // Admin Audit Logs Table
  const hasAdminAuditLogs = await knex.schema.hasTable(
    'internal_admin_audit_logs'
  );
  if (!hasAdminAuditLogs) {
    await knex.schema.createTable('internal_admin_audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('admin_id').notNullable();
      table.string('action').notNullable();
      table.json('details').nullable();
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.timestamps(true, true);

      // Foreign key to admins table
      table
        .foreign('admin_id')
        .references('id')
        .inTable('internal_admins')
        .onDelete('CASCADE');

      // Indexes for performance
      table.index(['admin_id']);
      table.index(['action']);
      table.index(['created_at']);
    });
  }
}
