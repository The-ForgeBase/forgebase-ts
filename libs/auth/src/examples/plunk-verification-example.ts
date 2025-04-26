import { Knex } from 'knex';
import {
  PlunkEmailVerificationService,
  PlunkVerificationConfig,
} from '../services/plunk-verification.service';
import { AppUser } from './types';

/**
 * Example of how to use the PlunkEmailVerificationService with HTML emails
 */
export async function setupPlunkVerificationService(knex: Knex) {
  // Configure the service
  const config: PlunkVerificationConfig = {
    // Plunk configuration (optional if using nodemailer)
    apiKey: process.env.PLUNK_API_KEY || '',
    fromEmail: 'noreply@yourdomain.com',
    fromName: 'Your App',
    templateId: 'your-plunk-template-id',

    // Token expiry settings
    tokenExpiryMinutes: 15, // 15 minutes for email verification
    resetTokenExpiryMinutes: 60, // 1 hour for password reset

    // Nodemailer configuration (optional)
    useNodemailer: true,
    smtpConfig: {
      host: 'smtp.useplunk.com',
      port: 587,
      secure: false,
      auth: {
        user: 'plunk',
        pass: process.env.PLUNK_API_KEY || '',
      },
    },

    // URL bases for verification and reset links
    verificationUrlBase: 'https://yourdomain.com/verify?token=',
  };

  // Create the service
  const verificationService = new PlunkEmailVerificationService(knex, config);

  // Example user
  const user: AppUser = {
    id: '123',
    email: 'user@example.com',
    name: 'John Doe',
    email_verified: false,
    phone_verified: false,
    created_at: undefined,
    updated_at: undefined,
    mfa_enabled: false,
  };

  // Example: Send verification email
  await verificationService.sendVerificationEmail(user.email, user);

  // Example: Send password reset email
  const resetToken = await verificationService.sendPasswordResetEmail(
    user.email,
    user,
    'https://yourdomain.com/reset-password'
  );
  console.log('Password reset token:', resetToken);

  // Example: Verify a token
  const isValid = await verificationService.verifyPasswordResetToken(
    resetToken,
    user.id
  );
  console.log('Is token valid?', isValid);

  // Example: Consume a token after password reset
  const consumed = await verificationService.consumePasswordResetToken(
    resetToken,
    user.id
  );
  console.log('Token consumed?', consumed);

  return verificationService;
}

/**
 * Example of how to use the PlunkEmailVerificationService with custom email templates
 */
export async function setupWithCustomTemplates(knex: Knex) {
  // Configure the service with custom email templates
  const config: PlunkVerificationConfig = {
    apiKey: process.env.PLUNK_API_KEY || '',
    fromEmail: 'noreply@yourdomain.com',
    fromName: 'Your App',

    // Use nodemailer with Plunk SMTP
    useNodemailer: true,
    smtpConfig: {
      host: 'smtp.useplunk.com',
      port: 587,
      secure: false,
      auth: {
        user: 'plunk',
        pass: process.env.PLUNK_API_KEY || '',
      },
    },

    // Custom email template generators
    generateHtmlEmail: async (params) => {
      const { name, token, verificationUrl, expiresInMinutes } = params;

      // You can use any template engine or HTML generation library here
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verify Your Email</title>
        </head>
        <body>
          <h1>Hello ${name}!</h1>
          <p>Please verify your email by using this code: <strong>${token}</strong></p>
          ${
            verificationUrl
              ? `<p>Or click <a href="${verificationUrl}">here</a> to verify.</p>`
              : ''
          }
          <p>This code will expire in ${expiresInMinutes} minutes.</p>
        </body>
        </html>
      `;
    },

    // Custom password reset email template
    generatePasswordResetEmail: async (params) => {
      const { name, resetUrl } = params;

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reset Your Password</title>
        </head>
        <body>
          <h1>Hello ${name}!</h1>
          <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </body>
        </html>
      `;
    },
  };

  return new PlunkEmailVerificationService(knex, config);
}
