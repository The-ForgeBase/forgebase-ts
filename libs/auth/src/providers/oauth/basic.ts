import { Knex } from 'knex';
import { User, AuthProvider, UserService } from '../../types';
import { OAuthUser } from '.';

export abstract class BaseOAuthProvider<TUser extends User>
  implements AuthProvider<TUser>
{
  abstract clientID: string;
  abstract clientSecret: string;
  abstract callbackURL: string;
  abstract scopes: string[];
  constructor(
    public config: {
      clientID?: string;
      clientSecret?: string;
      callbackURL: string;
      scopes?: string[];
      userService: UserService<TUser>;
      knex: Knex;
      name: string;
    }
  ) {}

  async getConfig() {
    const result = await this.config
      .knex('oauth_providers')
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
  }): Promise<TUser> {
    const { accessToken } = await this.exchangeCode(code, state);
    const profile = await this.getUserProfile(accessToken);

    let user = await this.config.userService.findUser(profile.email);
    if (!user) {
      user = await this.config.userService.createUser({
        name: profile.name,
        email_verified: profile.emailVerified,
        picture: profile.picture,
        email: profile.email,
      } as Partial<TUser>);

      // create oauth account
      await this.config.knex('oauth_accounts').insert({
        user_id: user.id,
        provider: this.config.name,
        provider_user_id: profile.id,
        provider_data: JSON.stringify(profile.data),
      });
    }

    // update oauth account
    await this.config
      .knex('oauth_accounts')
      .where('user_id', user.id)
      .where('provider', this.config.name)
      .update({
        provider_user_id: profile.id,
        provider_data: JSON.stringify(profile.data),
      });

    return user;
  }
}
