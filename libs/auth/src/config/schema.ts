import { Knex } from 'knex';

export async function initializeAuthSchema(knex: Knex) {
  // Auth Config Table
  const hasAuthConfig = await knex.schema.hasTable('auth_config');
  if (!hasAuthConfig) {
    await knex.schema.createTable('auth_config', (table) => {
      table.increments('id');
      table.jsonb('config').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // Users Table
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) {
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('email').unique().index();
      table.string('phone').unique().nullable();
      table.string('name').nullable();
      table.string('picture').nullable();
      table.string('password_hash').nullable();
      table.boolean('email_verified').defaultTo(false);
      table.boolean('phone_verified').defaultTo(false);
      table.boolean('mfa_enabled').defaultTo(false);
      table.string('mfa_secret').nullable();
      table.jsonb('mfa_recovery_codes').nullable();
      table.timestamp('last_login_at').nullable();
      table.timestamps(true, true);

      // Indexes for performance
      table.index(['email_verified']);
      table.index(['phone_verified']);
      table.index(['mfa_enabled']);
    });
  }

  // OAuth Accounts Table
  const hasOAuthAccounts = await knex.schema.hasTable('oauth_accounts');
  if (!hasOAuthAccounts) {
    await knex.schema.createTable('oauth_accounts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable();
      table.string('provider').notNullable();
      table.string('provider_user_id').notNullable();
      table.jsonb('provider_data').nullable();
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
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable();
      table.string('refresh_token').unique();
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
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
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
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
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
}
