import { Knex } from 'knex';
import { User, AuthProvider } from '../types';
import { KnexUserService } from '../userService';
import crypto from 'crypto';
import { AuthPasswordlessTokensTable } from '../config';

export class PasswordlessProvider implements AuthProvider {
  private config: {
    tokenStore: Knex;
    userService: KnexUserService;
    sendToken: (email: string, token: string) => Promise<void>;
  };

  constructor(config: {
    tokenStore: Knex;
    userService: KnexUserService;
    sendToken: (email: string, token: string) => Promise<void>;
  }) {
    this.config = config;
  }

  async authenticate({ email }: { email: string }): Promise<null> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.config.tokenStore(AuthPasswordlessTokensTable).insert({
      token,
      email,
      expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    await this.config.sendToken(email, token);
    return null; // No immediate user return
  }

  async validate(token: string): Promise<User> {
    const record = await this.config
      .tokenStore(AuthPasswordlessTokensTable)
      .where({ token })
      .where('expires_at', '>', new Date())
      .first();

    if (!record) throw new Error('Invalid token');

    const user = await this.config.userService.findUser(record.email);
    if (!user) throw new Error('User not found');

    return user;
  }
}
