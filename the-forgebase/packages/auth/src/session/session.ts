import { AuthToken, ConfigStore, SessionManager, User } from '../types.js';
import { Knex } from 'knex';
import { timeStringToDate } from '@the-forgebase/common';
import { generateSessionId, generateSessionToken } from '../lib/osolo.js';
import { AuthSessionsTable } from '../config/index.js';

export class BasicSessionManager implements SessionManager {
  private configStore: ConfigStore;
  private knex: Knex;
  constructor(configStore: ConfigStore, knex: Knex) {
    this.configStore = configStore;
    this.knex = knex;
  }

  async createSession(user: User) {
    const config = await this.configStore.getConfig();
    const token = generateSessionToken();

    const sessionToken = generateSessionId(token);

    const exixting = await this.knex(AuthSessionsTable)
      .where({ user_id: user.id })
      .where('expires_at', '>', this.knex.fn.now())
      .first();

    if (exixting && !config.sessionSettings.multipleSessions) {
      await this.knex(AuthSessionsTable).where({ user_id: user.id }).delete();
    }

    await this.knex(AuthSessionsTable).insert({
      token: sessionToken,
      user_id: user.id,
      expires_at: timeStringToDate(config.sessionSettings.refreshTokenTTL),
    });

    await this.knex('users')
      .where({ id: user.id })
      .update({ last_login_at: new Date() });

    return token;
  }

  async verifySession(
    token: string,
  ): Promise<{ user: User; token?: string | AuthToken }> {
    const sessionToken = generateSessionId(token);
    const session = await this.knex(AuthSessionsTable)
      .where({ token: sessionToken })
      .where('expires_at', '>', this.knex.fn.now())
      .first();

    if (!session) throw new Error('Invalid session');
    const user = await this.knex('users')
      .where({ id: session.user_id })
      .first();

    if (!user) throw new Error('Invalid session');
    return { user };
  }

  async destroySession(token: string): Promise<void> {
    const sessionToken = generateSessionId(token);
    await this.knex(AuthSessionsTable).where({ token: sessionToken }).delete();

    // Also clean up any expired sessions
    await this.knex(AuthSessionsTable)
      .where('expires_at', '<=', this.knex.fn.now())
      .delete();
  }

  async refreshSession(refreshToken: string): Promise<AuthToken | string> {
    throw new Error('Method not implemented.');
  }

  async validateToken(token: string): Promise<User> {
    const sessionToken = generateSessionId(token);
    const session = await this.knex(AuthSessionsTable)
      .where({ token: sessionToken })
      .where('expires_at', '>', this.knex.fn.now())
      .first();

    if (!session) throw new Error('Invalid session');
    const user = await this.knex('users')
      .where({ id: session.user_id })
      .first();

    if (!user) throw new Error('Invalid session');
    return user;
  }
}
