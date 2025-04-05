import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { NestAuthConfig } from '..';
import { User } from '../../../types';

// Mock user for testing
interface TestUser extends User {
  name?: string;
  email: string;
}

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService<TestUser>;

  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User',
  };

  // Store tokens and IDs for use across tests
  let userId: string;
  let authToken: string;
  let verificationToken: string;
  let resetToken: string;

  beforeAll(async () => {
    // Create mock auth service
    const mockAuthService = {
      register: jest.fn().mockImplementation((provider, credentials) => {
        userId = 'test-user-id-123';
        return {
          user: {
            id: userId,
            email: credentials.email,
            name: credentials.name,
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
          token: 'test-auth-token',
          verificationToken: 'test-verification-token',
        };
      }),
      login: jest.fn().mockImplementation((provider, credentials) => {
        return {
          user: {
            id: userId,
            email: credentials.email,
            name: 'Test User',
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
          token: 'test-auth-token',
        };
      }),
      verifyEmail: jest.fn().mockImplementation((userId, token) => {
        return {
          user: {
            id: userId,
            email: testUser.email,
            name: 'Test User',
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
          token: 'test-auth-token',
        };
      }),
      sendVerificationEmail: jest.fn().mockImplementation((email) => {
        return 'new-verification-token';
      }),
      sendPasswordResetEmail: jest.fn().mockImplementation((email) => {
        return 'test-reset-token';
      }),
      verifyPasswordResetToken: jest
        .fn()
        .mockImplementation((userId, token) => {
          return true;
        }),
      resetPassword: jest
        .fn()
        .mockImplementation((userId, newPassword, token) => {
          return true;
        }),
      getEmailVerificationService: jest.fn().mockImplementation(() => {
        return {
          config: {
            verificationUrlBase: 'http://localhost:3000/verify',
            resetUrlBase: 'http://localhost:3000/reset-password',
          },
        };
      }),
    };

    // Create mock config
    const mockConfig = {
      cookieOptions: {
        httpOnly: true,
        secure: false,
        maxAge: 3600000,
        path: '/',
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: 'AUTH_CONFIG',
          useValue: mockConfig,
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService<TestUser>>(AuthService);
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    // 1. Register with password
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          provider: 'password',
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body).toHaveProperty('verificationToken');

      // Store verification token for later tests
      verificationToken = response.body.verificationToken;

      // Verify the auth service was called correctly
      expect(authService.register).toHaveBeenCalledWith(
        'password',
        expect.objectContaining({
          email: testUser.email,
          password: testUser.password,
        })
      );
    });

    // 2. Login with password
    it('should login with password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          provider: 'password',
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body).toHaveProperty('token');

      // Store auth token for later tests
      authToken = response.body.token;

      // Verify the auth service was called correctly
      expect(authService.login).toHaveBeenCalledWith(
        'password',
        expect.objectContaining({
          email: testUser.email,
          password: testUser.password,
        })
      );
    });

    // 3. Verify email
    it('should verify email with token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          userId: userId,
          code: verificationToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email_verified).toBe(true);

      // Verify the auth service was called correctly
      expect(authService.verifyEmail).toHaveBeenCalledWith(
        userId,
        verificationToken
      );
    });

    // 4. Send verification email
    it('should send verification email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/send-verification-email')
        .send({
          email: testUser.email,
          redirectUrl: 'https://custom-app.com/verify',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty(
        'message',
        'Verification email sent'
      );
      expect(response.body).toHaveProperty('token');

      // Store new verification token
      verificationToken = response.body.token;

      // Verify the auth service was called correctly
      expect(authService.sendVerificationEmail).toHaveBeenCalledWith(
        testUser.email
      );

      // Verify the email verification service was accessed
      expect(authService.getEmailVerificationService).toHaveBeenCalled();
    });

    // 5. Forgot password
    it('should send password reset email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testUser.email,
          redirectUrl: 'https://custom-app.com/reset-password',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty(
        'message',
        'Password reset email sent'
      );
      expect(response.body).toHaveProperty('token');

      // Store reset token for later tests
      resetToken = response.body.token;

      // Verify the auth service was called correctly
      expect(authService.sendPasswordResetEmail).toHaveBeenCalledWith(
        testUser.email
      );

      // Verify the email verification service was accessed
      expect(authService.getEmailVerificationService).toHaveBeenCalled();
    });

    // 6. Verify reset token
    it('should verify reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-reset-token')
        .send({
          userId: userId,
          token: resetToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);

      // Verify the auth service was called correctly
      expect(authService.verifyPasswordResetToken).toHaveBeenCalledWith(
        userId,
        resetToken
      );
    });

    // 7. Reset password
    it('should reset password with token', async () => {
      const newPassword = 'NewPassword456!';

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          userId: userId,
          token: resetToken,
          newPassword: newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify the auth service was called correctly
      expect(authService.resetPassword).toHaveBeenCalledWith(
        userId,
        newPassword,
        resetToken
      );
    });

    // 8. Login with new password
    it('should login with new password', async () => {
      // Reset the mock to return a different response for the new password
      (authService.login as jest.Mock).mockImplementationOnce(
        (provider, credentials) => {
          return {
            user: {
              id: userId,
              email: credentials.email,
              name: 'Test User',
              email_verified: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
            token: 'new-auth-token-after-reset',
          };
        }
      );

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          provider: 'password',
          email: testUser.email,
          password: 'NewPassword456!', // Use the new password
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBe('new-auth-token-after-reset');

      // Verify the auth service was called correctly
      expect(authService.login).toHaveBeenCalledWith(
        'password',
        expect.objectContaining({
          email: testUser.email,
          password: 'NewPassword456!',
        })
      );
    });
  });
});
