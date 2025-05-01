import { Knex } from 'knex';
import { User, AuthProvider, UserService } from '../../types';
import { OAuthUser } from '.';
import { AuthOAuthAccountsTable, AuthOAuthProvidersTable } from '../../config';

export abstract class BaseOAuthProvider implements AuthProvider {
  abstract clientID: string;
  abstract clientSecret: string;
  abstract callbackURL: string;
  abstract scopes: string[];

  public config: {
    clientID?: string;
    clientSecret?: string;
    callbackURL: string;
    scopes?: string[];
    userService: UserService;
    knex: Knex;
    name: string;
  };

  constructor(config: {
    clientID?: string;
    clientSecret?: string;
    callbackURL: string;
    scopes?: string[];
    userService: UserService;
    knex: Knex;
    name: string;
  }) {
    this.config = config;
  }

  async getConfig() {
    const result = await this.config
      .knex(AuthOAuthProvidersTable)
      .where('name', this.config.name)
      .first();

    // if result is undefined and config is not complete, throw error
    if (
      !result &&
      (!this.config.clientID ||
        !this.config.clientSecret ||
        !this.config.scopes)
    ) {
      throw new Error(
        'OAuth provider is not configured. Please set clientID and clientSecret in config.'
      );
    }

    const config = {
      clientID: result?.client_id || this.config.clientID,
      clientSecret: result?.client_secret || this.config.clientSecret,
      callbackURL: this.config.callbackURL,
      scopes: result?.scopes?.split(',') || this.config.scopes,
    };

    return config;
  }

  abstract getAuthorizationUrl(): Promise<URL>;
  abstract exchangeCode(
    code: string,
    state: string
  ): Promise<{ accessToken: string }>;
  abstract getUserProfile(accessToken: string): Promise<OAuthUser>;

  async authenticate({
    code,
    state,
  }: {
    code: string;
    state: string;
  }): Promise<User> {
    const { accessToken } = await this.exchangeCode(code, state);
    const profile = await this.getUserProfile(accessToken);

    let user = await this.config.userService.findUser(profile.email);
    if (!user) {
      user = await this.config.userService.createUser({
        name: profile.name,
        email_verified: profile.emailVerified,
        picture: profile.picture,
        email: profile.email,
      } as Partial<User>);

      // create oauth account
      await this.config.knex(AuthOAuthAccountsTable).insert({
        user_id: user.id,
        provider: this.config.name,
        provider_user_id: profile.id,
        provider_data: JSON.stringify(profile.data),
      });
    }

    // update oauth account
    await this.config
      .knex(AuthOAuthAccountsTable)
      .where('user_id', user.id)
      .where('provider', this.config.name)
      .update({
        provider_user_id: profile.id,
        provider_data: JSON.stringify(profile.data),
      });

    return user;
  }
}
