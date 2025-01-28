import { Knex } from 'knex';
import { User, AuthProvider } from '../types';
import { KnexUserService } from '../userService';
import crypto from 'crypto';

export class PasswordlessProvider<TUser extends User>
  implements AuthProvider<TUser>
{
  constructor(
    private config: {
      tokenStore: Knex;
      userService: KnexUserService<TUser>;
      sendToken: (email: string, token: string) => Promise<void>;
    }
  ) {}

  async authenticate({ email }: { email: string }) {
    const token = crypto.randomBytes(32).toString('hex');
    await this.config.tokenStore('passwordless_tokens').insert({
      token,
      email,
      expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    await this.config.sendToken(email, token);
    return null; // No immediate user return
  }

  async verifyToken(token: string) {
    const record = await this.config
      .tokenStore('passwordless_tokens')
      .where({ token })
      .where('expires_at', '>', new Date())
      .first();

    if (!record) throw new Error('Invalid token');

    const user = await this.config.userService.findUser(record.email);
    if (!user) throw new Error('User not found');

    return user;
  }
}
