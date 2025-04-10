import { AuthConfig, AuthToken, SessionManager, User } from '../types';
import jwt from 'jsonwebtoken';
import { Knex } from 'knex';
import { timeStringToDate } from '@forgebase-ts/common';
import { generateSessionId, generateSessionToken } from '../lib/osolo';
import {
  AuthAccessTokensTable,
  AuthRefreshTokensTable,
  AuthUsersTable,
} from '../config';

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

    await this.knex(AuthRefreshTokensTable).insert({
      token: refreshToken,
      user_id: user.id,
      expires_at: timeStringToDate(this.config.sessionSettings.refreshTokenTTL),
    });

    await this.knex(AuthAccessTokensTable).insert({
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
    const tokenRecord = await this.knex(AuthRefreshTokensTable)
      .where({ token: decoded })
      .where('expires_at', '>', new Date())
      .first();

    if (!tokenRecord) throw new Error('Invalid refresh token');

    // Rotate refresh token
    await this.knex(AuthRefreshTokensTable)
      .where({ token: refreshToken })
      .delete();
    // delete old access token
    await this.knex(AuthAccessTokensTable)
      .where('expires_at', '<=', new Date())
      .delete();

    const user = await this.knex(AuthUsersTable)
      .where({ id: tokenRecord.user_id })
      .first();

    return this.createSession(user);
  }

  async verifySession(
    token: string
  ): Promise<{ user: User; token?: string | AuthToken }> {
    const accessToken = await this.knex(AuthAccessTokensTable)
      .where({ token })
      .where('expires_at', '>', new Date())
      .first();

    // if expired, unsign and verify
    if (!accessToken) {
      const decoded = jwt.verify(token, this.secret);
      if (!decoded) throw new Error('Invalid access token');

      // get the user refresh token
      const refreshToken = await this.knex(AuthRefreshTokensTable)
        .where({ user_id: decoded.sub })
        .where('expires_at', '>', new Date())
        .first();
      if (!refreshToken) throw new Error('Invalid access token');

      // verify refresh token
      const user = await this.knex(AuthUsersTable)
        .where({ id: decoded.sub })
        .first();

      if (!user) throw new Error('Invalid access token');

      // rotate refresh token
      await this.knex(AuthRefreshTokensTable)
        .where({ token: refreshToken.token })
        .delete();
      // delete old access token
      await this.knex(AuthAccessTokensTable)
        .where('expires_at', '<=', new Date())
        .delete();
      await this.knex(AuthRefreshTokensTable)
        .where('expires_at', '<=', new Date())
        .delete();

      const fToken = await this.createSession(user);

      return { user, token: fToken };
    }

    const user = await this.knex(AuthUsersTable)
      .where({ id: accessToken.user_id })
      .first();

    if (!user) throw new Error('Invalid access token');
    return user;
  }

  async destroySession(token: string): Promise<void> {
    await this.knex(AuthAccessTokensTable).where({ token }).delete();
    await this.knex(AuthRefreshTokensTable).where({ token }).delete();
  }

  async validateToken(token: string): Promise<User> {
    const decoded = jwt.verify(token, this.secret);
    if (!decoded) throw new Error('Invalid access token');

    const user = await this.knex(AuthUsersTable)
      .where({ id: decoded.sub })
      .first();

    if (!user) throw new Error('Invalid access token');
    return user;
  }
}
