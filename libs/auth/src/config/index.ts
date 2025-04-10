export * from './knex-config';
export * from './schema';

export const AuthConfigTable = 'forge_auth_config';
export const AuthCryptoKeysTable = 'forge_auth_crypto_keys';
export const AuthUsersTable = 'forge_auth_users';
export const AuthOAuthProvidersTable = 'forge_auth_oauth_providers';
export const AuthOAuthAccountsTable = 'forge_auth_oauth_accounts';
export const AuthOAuthStatesTable = 'forge_auth_oauth_states';
export const AuthSessionsTable = 'forge_auth_sessions';
export const AuthVerificationTokensTable = 'forge_auth_verification_tokens';
export const AuthAccessTokensTable = 'forge_auth_access_tokens';
export const AuthRefreshTokensTable = 'forge_auth_refresh_tokens';
export const AuthAPIKeysTable = 'forge_auth_api_keys';
export const AuthAdminsTable = 'forge_auth_admins';
export const AuthAdminSessionsTable = 'forge_auth_admin_sessions';
export const AuthAdminAuditLogsTable = 'forge_auth_admin_audit_logs';
export const AuthPasswordlessTokensTable = 'forge_auth_passwordless_tokens';

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
];
