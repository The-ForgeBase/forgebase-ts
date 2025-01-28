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
    const config = await this.config
      .knex('oauth_providers')
      .where('provider', this.config.name)
      .first();
    return {
      clientID: config?.client_id || this.config.clientID,
      clientSecret: config?.client_secret || this.config.clientSecret,
      callbackURL: this.config.callbackURL,
      scopes: config?.scopes?.split(',') || this.config.scopes,
    };
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
    }

    return user;
  }
}
