export * from './knex-config.js';
export * from './schema.js';

export const AuthConfigTable = 'fg_auth_config';
export const AuthCryptoKeysTable = 'fg_auth_crypto_keys';
export const AuthUsersTable = 'fg_auth_users';
export const AuthOAuthProvidersTable = 'fg_auth_oauth_providers';
export const AuthOAuthAccountsTable = 'fg_auth_oauth_accounts';
export const AuthOAuthStatesTable = 'fg_auth_oauth_states';
export const AuthSessionsTable = 'fg_auth_sessions';
export const AuthVerificationTokensTable = 'fg_auth_verification_tokens';
export const AuthAccessTokensTable = 'fg_auth_access_tokens';
export const AuthRefreshTokensTable = 'fg_auth_refresh_tokens';
export const AuthAPIKeysTable = 'fg_auth_api_keys';
export const AuthAdminsTable = 'fg_auth_admins';
export const AuthAdminSessionsTable = 'fg_auth_admin_sessions';
export const AuthAdminAuditLogsTable = 'fg_auth_admin_audit_logs';
export const AuthAdminApiKeysTable = 'fg_auth_admin_api_keys';
export const AuthPasswordlessTokensTable = 'fg_auth_passwordless_tokens';

export const AuthTables = [
  AuthConfigTable,
  AuthCryptoKeysTable,
  AuthUsersTable,
  AuthOAuthProvidersTable,
  AuthOAuthAccountsTable,
  AuthOAuthStatesTable,
  AuthSessionsTable,
  AuthVerificationTokensTable,
  AuthAccessTokensTable,
  AuthRefreshTokensTable,
  AuthAPIKeysTable,
  AuthAdminsTable,
  AuthAdminSessionsTable,
  AuthAdminAuditLogsTable,
  AuthPasswordlessTokensTable,
  AuthAdminApiKeysTable,
];
