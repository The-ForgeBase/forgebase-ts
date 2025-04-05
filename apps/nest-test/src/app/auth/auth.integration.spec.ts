import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule, db } from '../app.module';
import { AuthModule } from './auth.module';
import { ConfigModule } from '@nestjs/config';
import { Knex } from 'knex';
import cookieParser from 'cookie-parser';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let knex: Knex;

  // Test user data
  const testUser = {
    email: `test-${Date.now()}@example.com`, // Use timestamp to ensure uniqueness
    password: 'Password123!',
    name: 'Integration Test User',
  };

  // Store tokens and IDs for use across tests
  let userId: string;
  let authToken: string;
  let verificationToken: string;
  let resetToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        AppModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Use cookie-parser middleware
    app.use(cookieParser());

    await app.init();

    console.log('Test application initialized');

    // Use the db instance imported from app.module
    knex = db;

    // Clean up any existing test users
    await knex('users').where('email', testUser.email).delete();
  });

  afterAll(async () => {
    // Clean up test data
    await knex('users').where('email', testUser.email).delete();
    await knex('verification_tokens').where('user_id', userId).delete();

    await app.close();
    await knex.destroy();
  });

  describe('Authentication Flow', () => {
    // 1. Register with password
    it('should register a new user', async () => {
      console.log('Starting registration test...');
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          provider: 'password',
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        });

      console.log('Registration response status:', response.status);
      console.log(
        'Registration response body:',
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);

      // Store user ID for later tests
      userId = response.body.user.id;
      console.log('User ID from registration:', userId);

      // Store verification token if available
      if (response.body.verificationToken) {
        verificationToken = response.body.verificationToken;
        console.log('Verification token from registration:', verificationToken);
      }

      // Check for token in cookies
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        console.log('Cookies from registration:', cookies);
        // Extract auth token from cookies if present
        if (Array.isArray(cookies)) {
          const authCookie = cookies.find((cookie) =>
            cookie.startsWith('auth_token=')
          );
          if (authCookie) {
            authToken = authCookie.split(';')[0].replace('auth_token=', '');
            console.log('Auth token from cookies:', authToken);
          }
        } else if (
          typeof cookies === 'string' &&
          cookies.includes('auth_token=')
        ) {
          authToken = cookies.split(';')[0].replace('auth_token=', '');
          console.log('Auth token from cookie string:', authToken);
        }
      }
    });

    // 2. Login with password
    it('should login with password', async () => {
      console.log('Starting login test...');
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          provider: 'password',
          email: testUser.email,
          password: testUser.password,
        });

      console.log('Login response status:', response.status);
      console.log(
        'Login response body:',
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);

      // Check for token in response body
      if (response.body.token) {
        console.log('Token found in response body');
        authToken = response.body.token;
      }

      // Check for token in cookies
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        console.log('Cookies from login:', cookies);
        // Extract auth token from cookies if present
        if (Array.isArray(cookies)) {
          const authCookie = cookies.find((cookie) =>
            cookie.startsWith('auth_token=')
          );
          if (authCookie) {
            authToken = authCookie.split(';')[0].replace('auth_token=', '');
            console.log('Auth token from cookies:', authToken);
          }
        } else if (
          typeof cookies === 'string' &&
          cookies.includes('auth_token=')
        ) {
          authToken = cookies.split(';')[0].replace('auth_token=', '');
          console.log('Auth token from cookie string:', authToken);
        }
      }

      // Verify we have a token
      expect(authToken).toBeTruthy();
    });

    // 3. Send verification email if token not available from registration
    it('should send verification email', async () => {
      console.log('Starting send verification email test...');
      if (!verificationToken) {
        const response = await request(app.getHttpServer())
          .post('/auth/send-verification-email')
          .send({
            email: testUser.email,
            redirectUrl: 'http://localhost:4200/verify',
          });

        console.log(
          'Send verification email response status:',
          response.status
        );
        console.log(
          'Send verification email response body:',
          JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty(
          'message',
          'Verification email sent'
        );

        // Store verification token if available
        if (response.body.token) {
          verificationToken = response.body.token;
          console.log(
            'Verification token from send-verification-email:',
            verificationToken
          );
        }
      }

      // Skip this test if we still don't have a verification token
      if (!verificationToken) {
        console.warn(
          'No verification token available, skipping email verification tests'
        );
        return;
      }
    });

    // 4. Verify email
    it('should verify email with token', async () => {
      console.log('Starting verify email test...');
      // Skip this test if we don't have a verification token
      if (!verificationToken) {
        console.warn(
          'No verification token available, skipping email verification test'
        );
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          userId: userId,
          code: verificationToken,
        });

      console.log('Verify email response status:', response.status);
      console.log(
        'Verify email response body:',
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email_verified).toBe(true);
    });

    // 5. Forgot password
    it('should send password reset email', async () => {
      console.log('Starting forgot password test...');
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testUser.email,
          redirectUrl: 'http://localhost:4200/reset-password',
        });

      console.log('Forgot password response status:', response.status);
      console.log(
        'Forgot password response body:',
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty(
        'message',
        'Password reset email sent'
      );

      // Store reset token if available
      if (response.body.token) {
        resetToken = response.body.token;
        console.log('Reset token from forgot-password:', resetToken);
      }

      // Skip further tests if we don't have a reset token
      if (!resetToken) {
        console.warn('No reset token available, skipping password reset tests');
        return;
      }
    });

    // 6. Verify reset token
    it('should verify reset token', async () => {
      // Skip this test if we don't have a reset token
      if (!resetToken) {
        console.warn(
          'No reset token available, skipping reset token verification test'
        );
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/verify-reset-token')
        .send({
          userId: userId,
          token: resetToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
    });

    // 7. Reset password
    it('should reset password with token', async () => {
      // Skip this test if we don't have a reset token
      if (!resetToken) {
        console.warn('No reset token available, skipping password reset test');
        return;
      }

      const newPassword = 'NewPassword456!';

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          userId: userId,
          token: resetToken,
          newPassword: newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Update the test user password for the next test
      testUser.password = newPassword;
    });

    // 8. Login with new password
    it('should login with new password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          provider: 'password',
          email: testUser.email,
          password: testUser.password, // This should now be the new password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body).toHaveProperty('token');
    });
  });
});
