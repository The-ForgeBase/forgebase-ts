import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { NestAuthModule } from './nestjs.module';
import { DynamicAuthManager } from '../../authManager';
import { User, AuthToken } from '../../types';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';

// Mock user type for testing
interface TestUser extends User {
  email: string;
  name?: string;
}

// Mock auth manager for testing
class MockAuthManager implements Partial<DynamicAuthManager<TestUser>> {
  register = jest.fn();
  login = jest.fn();
  logout = jest.fn();
  validateToken = jest.fn();
  refreshToken = jest.fn();
  verifyEmail = jest.fn();
  verifySms = jest.fn();
  verifyMfa = jest.fn();
  enableMfa = jest.fn();
  disableMfa = jest.fn();
  oauthCallback = jest.fn();
  getProviderConfig = jest.fn();
  getConfig = jest.fn().mockReturnValue({ mfaSettings: { required: false } });
  getMfaStatus = jest.fn().mockReturnValue(false);
}

describe('NestAuthModule', () => {
  let app: INestApplication;
  let mockAuthManager: MockAuthManager;

  beforeEach(async () => {
    mockAuthManager = new MockAuthManager();
  });

  describe('forRoot', () => {
    beforeEach(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          NestAuthModule.forRoot({
            authManager:
              mockAuthManager as unknown as DynamicAuthManager<TestUser>,
            config: {
              loginPath: '/auth/login',
              registerPath: '/auth/register',
            },
          }),
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should be defined', () => {
      expect(app).toBeDefined();
    });

    it('should provide AuthService', () => {
      const authService = app.get<AuthService<TestUser>>(AuthService);
      expect(authService).toBeDefined();
    });

    it('should provide AuthGuard', () => {
      const authGuard = app.get<AuthGuard<TestUser>>(AuthGuard);
      expect(authGuard).toBeDefined();
    });

    describe('Register Endpoint', () => {
      it('should register a user successfully', async () => {
        const mockUser: Partial<TestUser> = {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        };

        const mockToken: AuthToken = {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        };

        mockAuthManager.register.mockResolvedValueOnce({
          user: mockUser,
          token: mockToken,
        });

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            provider: 'local',
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
          })
          .expect(200);

        expect(mockAuthManager.register).toHaveBeenCalledWith(
          'local',
          { email: 'test@example.com', name: 'Test User' },
          'password123'
        );

        expect(response.body).toEqual({
          user: mockUser,
          token: mockToken,
        });
      });

      it('should handle registration errors', async () => {
        mockAuthManager.register.mockRejectedValueOnce(
          new Error('Registration failed')
        );

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            provider: 'local',
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(400);

        expect(response.body).toEqual({
          error: 'Registration failed',
        });
      });

      it('should handle OAuth registration redirect', async () => {
        const mockUrl = new URL('https://oauth-provider.com/auth');

        mockAuthManager.register.mockResolvedValueOnce({
          token: 'google',
          url: mockUrl,
        });

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            provider: 'google',
            email: 'test@example.com',
          })
          .expect(302); // Redirect status code

        expect(response.header.location).toBe(mockUrl.toString());
      });
    });

    describe('Login Endpoint', () => {
      it('should login a user successfully', async () => {
        const mockUser: Partial<TestUser> = {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        };

        const mockToken: AuthToken = {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        };

        mockAuthManager.login.mockResolvedValueOnce({
          user: mockUser,
          token: mockToken,
        });

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            provider: 'local',
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(200);

        expect(mockAuthManager.login).toHaveBeenCalledWith('local', {
          email: 'test@example.com',
          password: 'password123',
        });

        // Check that cookies are set
        expect(response.headers['set-cookie']).toBeDefined();
        expect(response.headers['set-cookie'][0]).toContain(
          'token=access-token'
        );
        expect(response.headers['set-cookie'][1]).toContain(
          'refreshToken=refresh-token'
        );

        // Response should contain user but not token (as it's in cookies)
        expect(response.body).toEqual({
          user: mockUser,
        });
      });

      it('should handle login errors', async () => {
        mockAuthManager.login.mockRejectedValueOnce(
          new Error('Invalid credentials')
        );

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            provider: 'local',
            email: 'test@example.com',
            password: 'wrong-password',
          })
          .expect(400);

        expect(response.body).toEqual({
          error: 'Invalid credentials',
        });
      });

      it('should handle OAuth login redirect', async () => {
        const mockUrl = new URL('https://oauth-provider.com/auth');

        mockAuthManager.login.mockResolvedValueOnce({
          token: 'google',
          url: mockUrl,
        });

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            provider: 'google',
          })
          .expect(302); // Redirect status code

        expect(response.header.location).toBe(mockUrl.toString());
      });

      it('should handle passwordless login initiation', async () => {
        mockAuthManager.login.mockResolvedValueOnce({
          token: 'passwordless',
        });

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            provider: 'passwordless',
            email: 'test@example.com',
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message:
            'Passwordless login initiated, check your email or sms or whatsapp for verification code',
          exp: '15m',
        });
      });
    });
  });

  describe('forRootAsync', () => {
    beforeEach(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          NestAuthModule.forRootAsync({
            useFactory: () => ({
              authManager:
                mockAuthManager as unknown as DynamicAuthManager<TestUser>,
              config: {
                loginPath: '/auth/login',
                registerPath: '/auth/register',
              },
            }),
          }),
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should be defined', () => {
      expect(app).toBeDefined();
    });

    it('should provide AuthService', () => {
      const authService = app.get<AuthService<TestUser>>(AuthService);
      expect(authService).toBeDefined();
    });

    it('should provide AuthGuard', () => {
      const authGuard = app.get<AuthGuard<TestUser>>(AuthGuard);
      expect(authGuard).toBeDefined();
    });

    // We can add more specific tests for the async initialization if needed
  });
});
