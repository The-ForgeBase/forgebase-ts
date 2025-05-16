import { createMockDb } from '../test/utils/mock-db';
import { DynamicAuthManager } from './authManager';
import { AuthConfig } from './types';
import { createContainer, asValue, asClass, AwilixContainer } from 'awilix';
import { KnexConfigStore } from './config';
import { KnexUserService } from './userService';
import { BasicSessionManager } from './session';
import { Knex } from 'knex';

type ContainerCradle = {
  authManager: DynamicAuthManager;
  knex: Knex;
  configStore: KnexConfigStore;
  userService: KnexUserService;
  sessionManager: BasicSessionManager;
  authConfig: AuthConfig;
};

describe('DynamicAuthManager', () => {
  const { db, tracker } = createMockDb();
  let authManager: DynamicAuthManager;
  let container: AwilixContainer<ContainerCradle>;

  const mockConfig: AuthConfig = {
    id: 1,
    enabledProviders: ['local'],
    authPolicy: {
      emailVerificationRequired: true,
      passwordReset: true,
      passwordChange: true,
      accountDeletion: true,
      smsVerificationRequired: true,
      loginAfterRegistration: false,
    },
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      maxAttempts: 5,
    },
    sessionSettings: {
      accessTokenTTL: '15m',
      refreshTokenTTL: '7d',
      tokenRotation: true,
      multipleSessions: false,
    },
    mfaSettings: {
      required: false,
      allowedMethods: ['totp'],
    },
    adminFeature: {
      enabled: false,
      createInitialApiKey: false,
      initialApiKeyName: 'Initial Admin API Key',
      initialApiKeyScopes: ['*'],
    },
    rateLimiting: {
      login: { requests: 5, interval: '15m' },
      mfa: { requests: 3, interval: '5m' },
    },
  };

  beforeEach(() => {
    tracker.reset();
    container = createContainer();

    // Register required dependencies
    container.register({
      knex: asValue(db),
      configStore: asClass(KnexConfigStore),
      userService: asClass(KnexUserService),
      sessionManager: asClass(BasicSessionManager),
      authConfig: asValue(mockConfig),
      authManager: asClass(DynamicAuthManager).classic(),
    });

    // Get auth manager instance from container
    authManager = container.cradle.authManager;
  });

  describe('Authentication Flows', () => {
    describe('Local Authentication', () => {
      it('should authenticate user with valid credentials', async () => {
        const testUser = {
          id: '1',
          email: 'test@example.com',
          password_hash: 'hashedPassword123',
          email_verified: true,
          phone_verified: false,
          created_at: new Date(),
          updated_at: new Date(),
          mfa_enabled: false,
        };

        // Mock user lookup
        tracker.on.select('users').responseOnce([testUser]);

        // Mock password verification
        tracker.on
          .select(/SELECT.*FROM.*users.*WHERE.*email.*=.*?/)
          .responseOnce([testUser]);

        const result = await authManager.login('local', {
          email: testUser.email,
          password: 'correctPassword',
        });

        expect(result).toBeDefined();
        expect(result.user.id).toBe(testUser.id);
        expect(result.user.email).toBe(testUser.email);

        // Verify the correct queries were made
        const selectHistory = tracker.history.select;
        expect(selectHistory).toHaveLength(2);
        expect(selectHistory[0].bindings).toContain(testUser.email);
      });

      it('should reject authentication with invalid credentials', async () => {
        // Mock user lookup returning empty result
        tracker.on.select('users').responseOnce([]);

        await expect(
          authManager.login('local', {
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          })
        ).rejects.toThrow();

        const selectHistory = tracker.history.select;
        expect(selectHistory).toHaveLength(1);
      });

      it('should reject unverified users if verification is required', async () => {
        const unverifiedUser = {
          id: '1',
          email: 'unverified@example.com',
          password_hash: 'hashedPassword123',
          email_verified: false,
          phone_verified: false,
          created_at: new Date(),
          updated_at: new Date(),
          mfa_enabled: false,
        };

        // Mock user lookup
        tracker.on.select('users').responseOnce([unverifiedUser]);

        await expect(
          authManager.login('local', {
            email: unverifiedUser.email,
            password: 'correctPassword',
          })
        ).rejects.toThrow();
      });
    });

    describe('Session Management', () => {
      it('should create a session for authenticated user', async () => {
        const testUser = {
          id: '1',
          email: 'test@example.com',
          email_verified: true,
          phone_verified: false,
          created_at: new Date(),
          updated_at: new Date(),
          mfa_enabled: false,
        };

        // Mock user lookup
        tracker.on.select('users').responseOnce([testUser]);

        // Mock session creation
        tracker.on.insert('sessions').responseOnce([1]);

        const result = await authManager.login('local', {
          email: testUser.email,
          password: 'correctPassword',
        });

        expect(result.token).toBeDefined();
        expect(result.user).toBeDefined();

        const insertHistory = tracker.history.insert;
        expect(insertHistory).toHaveLength(1);
        expect(insertHistory[0].sql).toMatch(/INSERT.*INTO.*sessions/i);
      });
    });
  });
});
