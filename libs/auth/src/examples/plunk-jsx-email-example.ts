import { Knex } from 'knex';
import {
  PlunkEmailVerificationService,
  PlunkVerificationConfig,
} from '../services/plunk-verification.service';
import { User } from '../types';

// Define your user type
interface AppUser extends User {
  name?: string;
  email: string;
}

/**
 * Example of how to use the PlunkEmailVerificationService with JSX-Email templates
 */
export async function setupPlunkWithJsxEmail(knex: Knex) {
  // Configure the service to use Plunk with JSX-Email templates
  const config: PlunkVerificationConfig = {
    // Plunk API key (required for Plunk SMTP)
    apiKey: process.env.PLUNK_API_KEY || '',

    // Email sender details
    fromEmail: 'noreply@yourdomain.com',
    fromName: 'Your App',

    // Use nodemailer with Plunk SMTP
    useNodemailer: true,

    // Use JSX-Email templates (default is true)
    useJsxTemplates: true,

    // URL bases for verification and reset links
    verificationUrlBase: 'https://yourdomain.com/verify?token=',
  };

  // Create the service
  const verificationService = new PlunkEmailVerificationService<AppUser>(
    knex,
    config
  );

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

  // Example: Send verification email with JSX template
  await verificationService.sendVerificationEmail(user.email, user);

  // Example: Send password reset email with JSX template
  const resetToken = await verificationService.sendPasswordResetEmail(
    user.email,
    user,
    'https://yourdomain.com/reset-password'
  );

  return verificationService;
}

/**
 * Example of how to send emails directly using the Plunk transporter
 */
export async function sendEmailsDirectly() {
  // Import the necessary functions
  const { createPlunkTransporter } = await import(
    '../services/email-templates'
  );
  const { render } = await import('jsx-email');

  // Create the transporter
  const transporter = createPlunkTransporter(process.env.PLUNK_API_KEY || '');

  // Import the email templates
  const { VerifyEmailTemplate } = await import(
    '../services/email-templates/verify-email'
  );
  const { ResetPasswordEmail } = await import(
    '../services/email-templates/reset-password'
  );

  // Example: Send verification email
  const verifyEmailHtml = await render(
    VerifyEmailTemplate({
      url: 'https://yourdomain.com/verify?token=abc123',
      username: 'John Doe',
      expiryText: '24 hours',
    })
  );

  await transporter.sendMail({
    from: 'Your App <noreply@yourdomain.com>',
    to: 'user@example.com',
    subject: 'Verify your email address',
    html: verifyEmailHtml,
  });

  // Example: Send password reset email
  const resetPasswordHtml = await render(
    ResetPasswordEmail({
      url: 'https://yourdomain.com/reset-password?token=xyz789',
      username: 'John Doe',
    })
  );

  await transporter.sendMail({
    from: 'Your App <noreply@yourdomain.com>',
    to: 'user@example.com',
    subject: 'Reset your password',
    html: resetPasswordHtml,
  });
}
