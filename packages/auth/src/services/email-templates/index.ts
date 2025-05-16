import { render } from 'jsx-email';
import { ResetPasswordEmail } from './reset-password.js';
import { VerifyEmailTemplate } from './verify-email.js';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Create a nodemailer transporter for Plunk
 * @param apiKey The Plunk API key
 * @returns A configured nodemailer transporter
 */
export function createPlunkTransporter(apiKey: string): Transporter {
  return createTransport({
    host: 'smtp.useplunk.com',
    secure: false,
    port: 587,
    auth: {
      user: 'plunk',
      pass: apiKey,
    },
  });
}

/**
 * Generate HTML for a password reset email
 * @param url The reset password URL
 * @param username The user's name or username
 * @returns HTML string for the email
 */
export async function generateResetPasswordEmail(
  url: string,
  username?: string,
): Promise<string> {
  return render(ResetPasswordEmail({ url, username }));
}

/**
 * Generate HTML for an email verification email using JSX-Email template
 * @param params Parameters for the verification email
 * @returns HTML string for the email
 */
export async function generateVerificationEmailJsx(params: {
  name: string;
  token: string;
  expiresInMinutes: number;
  verificationUrl?: string;
}): Promise<string> {
  const { name, token, verificationUrl, expiresInMinutes } = params;

  // If we have a verification URL, use it directly
  if (verificationUrl) {
    return render(
      VerifyEmailTemplate({
        url: verificationUrl,
        username: name,
        expiryText: `${expiresInMinutes} minutes`,
      }),
    );
  }

  // If no verification URL, create a simple template that shows the token
  // This is a fallback and not using the JSX template
  return generateSimpleVerificationEmail(params);
}

/**
 * Generate HTML for an email verification email with a simple HTML template
 * @param params Parameters for the verification email
 * @returns HTML string for the email
 */
export async function generateSimpleVerificationEmail(params: {
  name: string;
  token: string;
  expiresInMinutes: number;
  verificationUrl?: string;
}): Promise<string> {
  const { name, token, verificationUrl, expiresInMinutes } = params;

  // Simple HTML template for verification email
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Verification</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          background-color: #ffffff;
          border-radius: 5px;
        }
        .header {
          color: #333;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 10px 0 30px;
        }
        .content {
          padding: 0 30px;
        }
        .greeting {
          font-size: 18px;
          line-height: 1.5;
          color: #333;
          font-weight: bold;
        }
        .paragraph {
          font-size: 16px;
          line-height: 1.5;
          color: #444;
          margin: 16px 0;
        }
        .button-container {
          margin: 30px 0;
          text-align: center;
        }
        .button {
          background-color: #0070f3;
          border-radius: 5px;
          color: #ffffff;
          font-size: 16px;
          font-weight: bold;
          text-decoration: none;
          text-align: center;
          display: inline-block;
          padding: 12px 30px;
        }
        .token {
          font-family: monospace;
          font-size: 18px;
          background-color: #f0f0f0;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          color: #666;
          font-size: 12px;
          text-align: center;
          margin-top: 30px;
          border-top: 1px solid #eaeaea;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="header">Email Verification</h1>

        <div class="content">
          <p class="greeting">Hello ${name}!</p>

          <p class="paragraph">
            Thank you for signing up. Please verify your email address to complete your registration.
          </p>

          ${
            verificationUrl
              ? `
          <div class="button-container">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </div>

          <p class="paragraph">
            If the button doesn't work, you can also copy and paste this link into your browser:
          </p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          `
              : `
          <p class="paragraph">
            Your verification code is:
          </p>
          <div class="token">${token}</div>
          `
          }

          <p class="paragraph">
            This verification ${
              verificationUrl ? 'link' : 'code'
            } will expire in ${expiresInMinutes} minutes.
          </p>
        </div>

        <div class="footer">
          © ${new Date().getFullYear()} Your Company. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}
