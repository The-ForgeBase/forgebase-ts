import { AuthConfig, SessionManager, User } from '../types';
import { Knex } from 'knex';
import { timeStringToDate } from '@forgebase-ts/common';
import { generateSessionId, generateSessionToken } from '../lib/osolo';

export class BasicSessionManager implements SessionManager {
  private config: AuthConfig;
  private knex: Knex;
  constructor(private secret: string, config: AuthConfig, knex: Knex) {
    this.config = config;
    this.knex = knex;
  }

  async createSession(user: User) {
    const token = generateSessionToken();
    const sessionToken = generateSessionId(token);

    const exixting = await this.knex('sessions')
      .where({ user_id: user.id })
      .where('expires_at', '>', new Date())
      .first();

    if (exixting && !this.config.sessionSettings.multipleSessions) {
      await this.knex('sessions').where({ user_id: user.id }).delete();
    }

    await this.knex('sessions').insert({
      token: sessionToken,
      user_id: user.id,
      expires_at: timeStringToDate(this.config.sessionSettings.refreshTokenTTL),
    });

    await this.knex('users')
      .where({ id: user.id })
      .update({ last_login_at: new Date() });

    return token;
  }

  async verifySession(token: string): Promise<User> {
    const sessionToken = generateSessionId(token);
    const session = await this.knex('sessions')
      .where({ token: sessionToken })
      .where('expires_at', '>', new Date())
      .first();

    if (!session) throw new Error('Invalid session');
    const user = await this.knex('users')
      .where({ id: session.user_id })
      .first();

    if (!user) throw new Error('Invalid session');
    return user;
  }

  async destroySession(token: string): Promise<void> {
    const sessionToken = generateSessionId(token);
    await this.knex('sessions').where({ token: sessionToken }).delete();
  }
}
