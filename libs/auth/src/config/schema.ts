import { Knex } from 'knex';
import { AuthConfig } from '../types';
import {
  AuthAccessTokensTable,
  AuthAdminAuditLogsTable,
  AuthAdminApiKeysTable,
  AuthAdminSessionsTable,
  AuthAdminsTable,
  AuthAPIKeysTable,
  AuthConfigTable,
  AuthCryptoKeysTable,
  AuthOAuthProvidersTable,
  AuthOAuthStatesTable,
  AuthPasswordlessTokensTable,
  AuthRefreshTokensTable,
  AuthSessionsTable,
  AuthUsersTable,
  AuthVerificationTokensTable,
} from '.';

export async function initializeAuthSchema(knex: Knex, config?: AuthConfig) {
  // Auth Config Table
  console.log('Initializing auth schema...');
  const hasAuthConfig = await knex.schema.hasTable(AuthConfigTable);
  if (!hasAuthConfig) {
    await knex.schema.createTable(AuthConfigTable, (table) => {
      table.increments('id');
      table.text('config').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // Crypto Keys Table for JWT signing
  const hasCryptoKeys = await knex.schema.hasTable(AuthCryptoKeysTable);
  if (!hasCryptoKeys) {
    await knex.schema.createTable(AuthCryptoKeysTable, (table) => {
      table.string('kid').primary(); // Key ID
      table.string('algorithm').notNullable(); // Signing algorithm
      table.text('private_key').notNullable(); // Private key in JWK format
      table.text('public_key').notNullable(); // Public key in JWK format
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('rotated_at').nullable();
      table.boolean('is_current').defaultTo(true);
      table.index(['is_current']);
    });
  }

  // OAuth Providers Table
  const hasAuthProviders = await knex.schema.hasTable(AuthOAuthProvidersTable);
  if (!hasAuthProviders) {
    await knex.schema.createTable(AuthOAuthProvidersTable, (table) => {
      table.increments('id');
      table.string('name').notNullable().unique();
      table.json('config').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // AuthOAuthStatesTable
  const hasAuthStates = await knex.schema.hasTable(AuthOAuthStatesTable);
  if (!hasAuthStates) {
    await knex.schema.createTable(AuthOAuthStatesTable, (table) => {
      table.string('state').primary();
      table.string('code_verifier').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // Users Table
  const hasUsers = await knex.schema.hasTable(AuthUsersTable);
  if (!hasUsers) {
    await knex.schema.createTable(AuthUsersTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('email').index().unique().notNullable();
      table.string('phone').unique().nullable();
      table.string('name').nullable();
      table.string('labels').nullable();
      table.string('teams').nullable();
      table.string('permissions').nullable();
      table.string('role').defaultTo('user').notNullable();
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

  // Passwpordless tokens Table
  const hasPasswordlessTokens = await knex.schema.hasTable(
    AuthPasswordlessTokensTable
  );
  if (!hasPasswordlessTokens) {
    await knex.schema.createTable(AuthPasswordlessTokensTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('token').notNullable().unique();
      table.string('email').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
    });
  }

  // Sessions Table
  const hasSessions = await knex.schema.hasTable(AuthSessionsTable);
  if (!hasSessions) {
    await knex.schema.createTable(AuthSessionsTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').notNullable().unique();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);

      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable(AuthUsersTable)
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['expires_at']);
    });
  }

  // Verification Tokens Table (for email/phone verification and password reset)
  const hasVerificationTokens = await knex.schema.hasTable(
    AuthVerificationTokensTable
  );
  if (!hasVerificationTokens) {
    await knex.schema.createTable(AuthVerificationTokensTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').notNullable().unique();
      table.string('type').notNullable(); // 'email', 'phone', 'password_reset'
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);

      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable(AuthUsersTable)
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['token']);
      table.index(['type']);
      table.index(['expires_at']);
    });
  }

  //Access Tokens Table
  const hasAccessTokens = await knex.schema.hasTable(AuthAccessTokensTable);
  if (!hasAccessTokens) {
    await knex.schema.createTable(AuthAccessTokensTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').notNullable().unique();
      table.string('kid').nullable(); // Key ID for JWT signing key
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable(AuthUsersTable)
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['token']);
      table.index(['expires_at']);
      table.index(['kid']);
    });
  }

  //Refresh Tokens Table
  const hasRefreshTokens = await knex.schema.hasTable(AuthRefreshTokensTable);
  if (!hasRefreshTokens) {
    await knex.schema.createTable(AuthRefreshTokensTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').notNullable();
      table.string('token').notNullable().unique();
      table.string('access_token').nullable(); // Reference to the associated access token
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
      // Foreign key to users table
      table
        .foreign('user_id')
        .references('id')
        .inTable(AuthUsersTable)
        .onDelete('CASCADE');
      // Indexes for performance
      table.index(['user_id']);
      table.index(['token']);
      table.index(['access_token']); // Index for faster lookups by access token
      table.index(['expires_at']);
    });
  } else {
    // Check if the access_token column exists, and add it if it doesn't
    const hasAccessTokenColumn = await knex.schema.hasColumn(
      AuthRefreshTokensTable,
      'access_token'
    );
    if (!hasAccessTokenColumn) {
      console.log('Adding access_token column to refresh tokens table...');
      await knex.schema.table(AuthRefreshTokensTable, (table) => {
        table.string('access_token').nullable();
        table.index(['access_token']);
      });
    }
  }

  // API Keys Table
  const hasApiKeys = await knex.schema.hasTable(AuthAPIKeysTable);
  if (!hasApiKeys) {
    await knex.schema.createTable(AuthAPIKeysTable, (table) => {
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
        .inTable(AuthUsersTable)
        .onDelete('CASCADE');

      // Composite index for faster lookups
      table.unique(['key_prefix', 'key_hash']);

      // Indexes for performance
      table.index(['user_id']);
      table.index(['key_prefix']);
      table.index(['expires_at']);
    });
  }

  console.log('Auth schema initialized');

  // Only create admin tables if admin feature is enabled
  if (config?.adminFeature?.enabled) {
    await initializeAdminTables(knex);
  }
}

/**
 * Initialize admin-specific database tables
 */
export async function initializeAdminTables(knex: Knex): Promise<void> {
  console.log('Initializing admin tables...');

  // Admins Table
  const hasAdmins = await knex.schema.hasTable(AuthAdminsTable);
  if (!hasAdmins) {
    await knex.schema.createTable(AuthAdminsTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('email').index().unique().notNullable();
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
  const hasAdminSessions = await knex.schema.hasTable(AuthAdminSessionsTable);
  if (!hasAdminSessions) {
    await knex.schema.createTable(AuthAdminSessionsTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('admin_id').notNullable();
      table.string('token').unique().notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);

      // Foreign key to admins table
      table
        .foreign('admin_id')
        .references('id')
        .inTable(AuthAdminsTable)
        .onDelete('CASCADE');

      // Indexes for performance
      table.index(['admin_id']);
      table.index(['expires_at']);
    });
  }

  // Admin Audit Logs Table
  const hasAdminAuditLogs = await knex.schema.hasTable(AuthAdminAuditLogsTable);
  if (!hasAdminAuditLogs) {
    await knex.schema.createTable(AuthAdminAuditLogsTable, (table) => {
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
        .inTable(AuthAdminsTable)
        .onDelete('CASCADE');

      // Indexes for performance
      table.index(['admin_id']);
      table.index(['action']);
      table.index(['created_at']);
    });
  }

  // Admin API Keys Table
  const hasAdminApiKeys = await knex.schema.hasTable(AuthAdminApiKeysTable);
  if (!hasAdminApiKeys) {
    await knex.schema.createTable(AuthAdminApiKeysTable, (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('admin_id').notNullable();
      table.string('key_prefix').notNullable();
      table.string('key_hash').notNullable();
      table.string('name').notNullable();
      table.json('scopes').nullable();
      table.timestamp('expires_at').nullable(); // null means non-expiring key
      table.timestamp('last_used_at').nullable();
      table.timestamps(true, true);

      // Foreign key to admins table
      table
        .foreign('admin_id')
        .references('id')
        .inTable(AuthAdminsTable)
        .onDelete('CASCADE');

      // Composite index for faster lookups
      table.unique(['key_prefix', 'key_hash']);

      // Indexes for performance
      table.index(['admin_id']);
      table.index(['key_prefix']);
      table.index(['expires_at']);
    });
  }
}
