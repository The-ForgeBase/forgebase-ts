import { EmailVerificationService, User } from '../types';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { createTransport, Transporter } from 'nodemailer';
import {
  generateResetPasswordEmail,
  generateVerificationEmailJsx,
  createPlunkTransporter,
  generateSimpleVerificationEmail,
} from './email-templates';
import { AuthVerificationTokensTable } from '../config';

export interface PlunkVerificationConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  templateId?: string;
  tokenExpiryMinutes?: number;
  /**
   * Token expiry time for password reset tokens in minutes
   * Default: 60 minutes (1 hour)
   */
  resetTokenExpiryMinutes?: number;
  /**
   * Whether to use nodemailer for sending emails
   * If true, smtpConfig must be provided
   */
  useNodemailer?: boolean;
  /**
   * SMTP configuration for nodemailer
   */
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  /**
   * Template ID for password reset emails (Plunk)
   */
  passwordResetTemplateId?: string;
  /**
   * Function to generate HTML email content for verification emails
   * If provided, this will be used instead of the built-in templates
   */
  generateHtmlEmail?: (params: {
    name: string;
    token: string;
    expiresInMinutes: number;
    verificationUrl?: string;
  }) => Promise<string> | string;

  /**
   * Whether to use the built-in JSX-Email templates
   * If true, the service will use the JSX-Email templates when possible
   * Default: true
   */
  useJsxTemplates?: boolean;
  /**
   * Function to generate HTML email content for password reset emails
   * If provided, this will be used instead of the default template
   */
  generatePasswordResetEmail?: (params: {
    name: string;
    token: string;
    resetUrl: string;
  }) => Promise<string> | string;
  /**
   * Base URL for verification links
   * If provided, a full verification URL will be generated and passed to the email template
   * Example: https://example.com/verify?token=
   */
  verificationUrlBase?: string;

  /**
   * Base URL for password reset links
   * If provided, a full reset URL will be generated and passed to the email template
   * Example: https://example.com/reset-password?token=
   */
  resetUrlBase?: string;

  /**
   * Query parameter name for the token in verification and reset URLs
   * Default: 'token'
   */
  tokenQueryParam?: string;

  /**
   * Additional query parameters to include in verification and reset URLs
   * Example: { redirect: '/dashboard' }
   */
  additionalQueryParams?: Record<string, string>;
}

export class PlunkEmailVerificationService<TUser extends User>
  implements EmailVerificationService<TUser>
{
  private readonly tableName = AuthVerificationTokensTable;
  private readonly tokenExpiryMinutes: number;
  private transporter: Transporter | null = null;

  constructor(private knex: Knex, private config: PlunkVerificationConfig) {
    this.tokenExpiryMinutes = config.tokenExpiryMinutes || 15; // Default 15 minutes

    // Initialize nodemailer transporter if configured
    if (this.config.useNodemailer) {
      if (this.config.smtpConfig) {
        // Use provided SMTP config
        this.transporter = createTransport(this.config.smtpConfig);
      } else if (this.config.apiKey) {
        // Use Plunk SMTP with the API key
        this.transporter = createPlunkTransporter(this.config.apiKey);
      }
    }
  }

  /**
   * Generate a verification URL for the given token
   * @param token The verification token
   * @param userId Optional user ID to include in the URL
   * @returns The full verification URL or undefined if no base URL is configured
   */
  generateVerificationUrl(token: string, userId?: string): string | undefined {
    if (!this.config.verificationUrlBase) {
      return undefined;
    }

    return this.buildUrl(
      this.config.verificationUrlBase,
      token,
      userId,
      this.config.tokenQueryParam,
      this.config.additionalQueryParams
    );
  }

  /**
   * Generate a password reset URL for the given token
   * @param token The reset token
   * @param userId Optional user ID to include in the URL
   * @returns The full reset URL or undefined if no base URL is configured
   */
  generateResetUrl(token: string, userId?: string): string | undefined {
    if (!this.config.resetUrlBase) {
      return undefined;
    }

    return this.buildUrl(
      this.config.resetUrlBase,
      token,
      userId,
      this.config.tokenQueryParam,
      this.config.additionalQueryParams
    );
  }

  /**
   * Build a URL with the given parameters
   * @param baseUrl The base URL
   * @param token The token to include
   * @param userId Optional user ID to include
   * @param tokenParam The query parameter name for the token
   * @param additionalParams Additional query parameters to include
   * @returns The full URL
   */
  private buildUrl(
    baseUrl: string,
    token: string,
    userId?: string,
    tokenParam = 'token',
    additionalParams?: Record<string, string>
  ): string {
    // Create URL object to handle query parameters properly
    const url = new URL(baseUrl);

    // Add token parameter
    url.searchParams.set(tokenParam, token);

    // Add user ID parameter if provided
    if (userId) {
      url.searchParams.set('userId', userId);
    }

    // Add additional parameters if provided
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Send a verification email to the user
   * @param email The recipient's email address
   * @param user The user object
   * @param customVerificationUrlBase Optional custom base URL for verification link
   * @returns The generated verification token
   */
  async sendVerificationEmail(
    email: string,
    user: TUser,
    customVerificationUrlBase?: string
  ): Promise<string> {
    // Generate a verification token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.tokenExpiryMinutes);

    // Store the token
    await this.knex(this.tableName).insert({
      id: uuidv4(),
      user_id: user.id,
      token,
      type: 'email',
      expires_at: expiresAt,
    });

    // Prepare common email variables
    const name = user.name || email;

    // Generate verification URL if base URL is configured or provided
    const verificationUrl = customVerificationUrlBase
      ? this.buildUrl(
          customVerificationUrlBase,
          token,
          user.id,
          this.config.tokenQueryParam,
          this.config.additionalQueryParams
        )
      : this.generateVerificationUrl(token, user.id);

    // Use nodemailer if configured
    if (this.config.useNodemailer && this.transporter) {
      try {
        let htmlContent: string | undefined;

        // Generate HTML content if a generator function is provided
        if (this.config.generateHtmlEmail) {
          // Use custom generator if provided
          htmlContent = await Promise.resolve(
            this.config.generateHtmlEmail({
              name,
              token,
              expiresInMinutes: this.tokenExpiryMinutes,
              verificationUrl,
            })
          );
        } else if (verificationUrl) {
          // Use JSX template if we have a verification URL
          htmlContent = await generateVerificationEmailJsx({
            name,
            token,
            expiresInMinutes: this.tokenExpiryMinutes,
            verificationUrl,
          });
        } else {
          // Use simple template if we only have a token
          htmlContent = await generateSimpleVerificationEmail({
            name,
            token,
            expiresInMinutes: this.tokenExpiryMinutes,
            verificationUrl,
          });
        }

        // Send email via nodemailer
        await this.transporter.sendMail({
          from: `${this.config.fromName || 'Verification Service'} <${
            this.config.fromEmail
          }>`,
          to: email,
          subject: 'Email Verification',
          text: `Hello ${name}, please verify your email using this token: ${token}. This token will expire in ${this.tokenExpiryMinutes} minutes.`,
          html: htmlContent,
        });

        // Return the generated token
        return token;
      } catch (error) {
        console.error('Failed to send email via nodemailer:', error);
        // Fall back to Plunk if nodemailer fails and Plunk is configured
        if (!this.config.apiKey) {
          throw new Error(
            `Failed to send verification email: ${error.message}`
          );
        }
      }
    }

    // Send email via Plunk if nodemailer is not configured or failed
    if (this.config.apiKey) {
      const response = await fetch('https://api.useplunk.com/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          to: email,
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName || 'Verification Service',
          },
          templateId: this.config.templateId,
          variables: {
            name,
            token,
            expiresInMinutes: this.tokenExpiryMinutes,
            verificationUrl,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    } else {
      throw new Error(
        'No email sending method configured. Please provide either Plunk API key or nodemailer configuration.'
      );
    }

    // Return the generated token
    return token;
  }

  async verifyEmail(
    email: string,
    token: string,
    user: TUser
  ): Promise<boolean> {
    // Find and validate the token
    const verificationToken = await this.knex(this.tableName)
      .where({
        user_id: user.id,
        token,
        type: 'email',
      })
      .where('expires_at', '>', new Date())
      .first();

    if (!verificationToken) {
      return false;
    }

    // Delete the used token
    await this.knex(this.tableName)
      .where({ id: verificationToken.id })
      .delete();

    return true;
  }

  /**
   * Send a password reset email
   * @param email The recipient's email address
   * @param user The user object
   * @param resetUrl The URL for password reset (optional if resetUrlBase is configured)
   * @param customResetUrlBase Optional custom base URL for reset link (takes precedence over resetUrl and resetUrlBase)
   * @returns The generated token
   */
  async sendPasswordResetEmail(
    email: string,
    user: TUser,
    resetUrl?: string,
    customResetUrlBase?: string
  ): Promise<string> {
    // Generate a reset token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (this.config.resetTokenExpiryMinutes || 60)
    ); // Default 60 minutes for reset tokens

    // Store the token
    await this.knex(this.tableName).insert({
      id: uuidv4(),
      user_id: user.id,
      token,
      type: 'password_reset',
      expires_at: expiresAt,
    });

    // Generate the full reset URL
    let fullResetUrl: string;

    // If customResetUrlBase is provided, use it (highest priority)
    if (customResetUrlBase) {
      fullResetUrl =
        this.buildUrl(
          customResetUrlBase,
          token,
          user.id,
          this.config.tokenQueryParam,
          this.config.additionalQueryParams
        ) || '';
    }
    // If resetUrlBase is configured, use it to generate the URL
    else if (this.config.resetUrlBase) {
      fullResetUrl = this.generateResetUrl(token, user.id) || '';
    }
    // Otherwise, use the provided resetUrl parameter
    else if (resetUrl) {
      fullResetUrl = `${resetUrl}${
        resetUrl.includes('?') ? '&' : '?'
      }token=${token}`;
    }
    // If none of the above are available, we'll still send the email with just the token
    else {
      fullResetUrl = '';
    }

    const name = user.name || email;

    // Use nodemailer if configured
    if (this.config.useNodemailer && this.transporter) {
      try {
        let htmlContent: string | undefined;

        // Generate HTML content for password reset
        if (this.config.generatePasswordResetEmail) {
          // Use custom generator if provided
          htmlContent = await Promise.resolve(
            this.config.generatePasswordResetEmail({
              name,
              token,
              resetUrl: fullResetUrl,
            })
          );
        } else {
          // Use default template
          htmlContent = await generateResetPasswordEmail(fullResetUrl, name);
        }

        // Send email via nodemailer
        await this.transporter.sendMail({
          from: `${this.config.fromName || 'Password Reset Service'} <${
            this.config.fromEmail
          }>`,
          to: email,
          subject: 'Password Reset Request',
          text: `Hello ${name}, please reset your password using this link: ${fullResetUrl}. This link will expire in ${
            this.config.resetTokenExpiryMinutes || 60
          } minutes.`,
          html: htmlContent,
        });

        return token;
      } catch (error) {
        console.error(
          'Failed to send password reset email via nodemailer:',
          error
        );
        // Fall back to Plunk if nodemailer fails and Plunk is configured
        if (!this.config.apiKey) {
          throw new Error(
            `Failed to send password reset email: ${error.message}`
          );
        }
      }
    }

    // Send email via Plunk if nodemailer is not configured or failed
    if (this.config.apiKey) {
      const response = await fetch('https://api.useplunk.com/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          to: email,
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName || 'Password Reset Service',
          },
          templateId:
            this.config.passwordResetTemplateId || this.config.templateId,
          variables: {
            name,
            token,
            resetUrl: fullResetUrl,
            expiresInMinutes: this.config.resetTokenExpiryMinutes || 60,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Failed to send password reset email: ${error.message}`
        );
      }
    } else {
      throw new Error(
        'No email sending method configured. Please provide either Plunk API key or nodemailer configuration.'
      );
    }

    return token;
  }

  /**
   * Verify a password reset token
   * @param token The reset token
   * @param userId The user ID
   * @returns True if the token is valid, false otherwise
   */
  async verifyPasswordResetToken(
    token: string,
    userId: string
  ): Promise<boolean> {
    // Find and validate the token
    const resetToken = await this.knex(this.tableName)
      .where({
        user_id: userId,
        token,
        type: 'password_reset',
      })
      .where('expires_at', '>', new Date())
      .first();

    return !!resetToken;
  }

  /**
   * Consume a password reset token (mark it as used)
   * @param token The reset token
   * @param userId The user ID
   * @returns True if the token was found and consumed, false otherwise
   */
  async consumePasswordResetToken(
    token: string,
    userId: string
  ): Promise<boolean> {
    // Find and validate the token
    const resetToken = await this.knex(this.tableName)
      .where({
        user_id: userId,
        token,
        type: 'password_reset',
      })
      .where('expires_at', '>', new Date())
      .first();

    if (!resetToken) {
      return false;
    }

    // Delete the used token
    await this.knex(this.tableName).where({ id: resetToken.id }).delete();

    return true;
  }
}
