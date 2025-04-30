import {
  AuthConfig,
  AuthToken,
  ConfigStore,
  SessionManager,
  User,
} from '../types';
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
  private configStore: ConfigStore;
  private knex: Knex;
  private options: jwt.SignOptions;
  constructor(
    private secret: string,
    options: jwt.SignOptions = { expiresIn: '1h' },
    configStore: ConfigStore,
    knex: Knex
  ) {
    this.configStore = configStore;
    this.knex = knex;
    this.options = {
      ...options,
    };
  }

  async createSession(user: User) {
    const config = await this.configStore.getConfig();
    const accessToken = jwt.sign({ sub: user.id }, this.secret, {
      ...this.options,
      expiresIn: config.sessionSettings.accessTokenTTL as any,
    });
    const token = generateSessionToken();
    const refreshToken = generateSessionId(token);

    await this.knex(AuthRefreshTokensTable).insert({
      token: refreshToken,
      user_id: user.id,
      access_token: accessToken, // Store reference to the access token
      expires_at: timeStringToDate(config.sessionSettings.refreshTokenTTL),
    });

    await this.knex(AuthAccessTokensTable).insert({
      token: accessToken,
      user_id: user.id,
      expires_at: timeStringToDate(config.sessionSettings.accessTokenTTL),
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
      .where('expires_at', '>', this.knex.fn.now())
      .first();

    if (!tokenRecord) throw new Error('Invalid refresh token');

    // Rotate refresh token
    await this.knex(AuthRefreshTokensTable)
      .where({ token: refreshToken })
      .delete();
    // delete old access token
    await this.knex(AuthAccessTokensTable)
      .where('expires_at', '<=', this.knex.fn.now())
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
      .where('expires_at', '>', this.knex.fn.now())
      .first();

    // if expired, unsign and verify
    if (!accessToken) {
      const decoded = jwt.verify(token, this.secret);
      if (!decoded) throw new Error('Invalid access token');

      // get the user refresh token
      const refreshToken = await this.knex(AuthRefreshTokensTable)
        .where({ user_id: decoded.sub })
        .where('expires_at', '>', this.knex.fn.now())
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
        .where('expires_at', '<=', this.knex.fn.now())
        .delete();
      await this.knex(AuthRefreshTokensTable)
        .where('expires_at', '<=', this.knex.fn.now())
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
    // Find and delete any refresh tokens associated with this access token
    await this.knex(AuthRefreshTokensTable)
      .where({ access_token: token })
      .delete();

    // Delete the access token
    await this.knex(AuthAccessTokensTable).where({ token }).delete();

    // Also clean up any expired tokens
    await this.knex(AuthAccessTokensTable)
      .where('expires_at', '<=', this.knex.fn.now())
      .delete();
    await this.knex(AuthRefreshTokensTable)
      .where('expires_at', '<=', this.knex.fn.now())
      .delete();
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
