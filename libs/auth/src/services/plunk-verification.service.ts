import { EmailVerificationService, User } from '../types';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export interface PlunkVerificationConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  templateId?: string;
  tokenExpiryMinutes?: number;
}

export class PlunkEmailVerificationService<TUser extends User>
  implements EmailVerificationService<TUser>
{
  private readonly tableName = 'verification_tokens';
  private readonly tokenExpiryMinutes: number;

  constructor(private knex: Knex, private config: PlunkVerificationConfig) {
    this.tokenExpiryMinutes = config.tokenExpiryMinutes || 15; // Default 15 minutes
  }

  async sendVerificationEmail(email: string, user: TUser): Promise<void> {
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

    // Send email via Plunk
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
          name: user.name || email,
          token,
          expiresInMinutes: this.tokenExpiryMinutes,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
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
}
