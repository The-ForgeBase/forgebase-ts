import { AuthConfig, SessionManager, User } from '../types';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Knex } from 'knex';
// import type { StringValue } from 'ms';
import { timeStringToDate } from '@forgebase-ts/common';
import { generateSessionId, generateSessionToken } from '../lib/osolo';

export class JwtSessionManager implements SessionManager {
  private config: AuthConfig;
  private knex: Knex;
  private options: jwt.SignOptions;
  constructor(
    private secret: string,
    options: jwt.SignOptions = { expiresIn: '1h' },
    config: AuthConfig,
    knex: Knex
  ) {
    this.config = config;
    this.knex = knex;
    this.options = {
      ...options,
      expiresIn: config.sessionSettings.accessTokenTTL as any,
    };
  }

  async createSession(user: User) {
    const accessToken = jwt.sign({ sub: user.id }, this.secret, this.options);
    const token = generateSessionToken();
    const refreshToken = generateSessionId(token);

    await this.knex('refresh_tokens').insert({
      token: refreshToken,
      user_id: user.id,
      expires_at: timeStringToDate(this.config.sessionSettings.refreshTokenTTL),
    });

    await this.knex('access_tokens').insert({
      token: accessToken,
      user_id: user.id,
      expires_at: timeStringToDate(this.config.sessionSettings.accessTokenTTL),
    });

    await this.knex('users')
      .where({ id: user.id })
      .update({ last_login_at: new Date() });

    return { accessToken, refreshToken: token };
  }

  async refreshSession(refreshToken: string) {
    const decoded = generateSessionId(refreshToken);
    const tokenRecord = await this.knex('refresh_tokens')
      .where({ token: decoded })
      .where('expires_at', '>', new Date())
      .first();

    if (!tokenRecord) throw new Error('Invalid refresh token');

    // Rotate refresh token
    await this.knex('refresh_tokens').where({ token: refreshToken }).delete();
    // delete old access token
    await this.knex('access_tokens')
      .where('expires_at', '<=', new Date())
      .delete();

    const user = await this.knex('users')
      .where({ id: tokenRecord.user_id })
      .first();

    return this.createSession(user);
  }

  async verifySession(token: string): Promise<User> {
    const accessToken = await this.knex('access_tokens')
      .where({ token })
      .where('expires_at', '>', new Date())
      .first();
    if (!accessToken) throw new Error('Invalid access token');

    const user = await this.knex('users')
      .where({ id: accessToken.user_id })
      .first();

    if (!user) throw new Error('Invalid access token');
    return user;
  }

  async destroySession(token: string): Promise<void> {
    await this.knex('access_tokens').where({ token }).delete();
    await this.knex('refresh_tokens').where({ token }).delete();
  }
}
