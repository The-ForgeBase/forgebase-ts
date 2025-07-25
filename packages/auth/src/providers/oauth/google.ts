import * as arctic from 'arctic';
import { BaseOAuthProvider } from './basic.js';
import { User, UserService } from '../../types.js';
import { Knex } from 'knex';
import axios from 'axios';
import { OAuthUser } from './index.js';
import { ArcticFetchError, OAuth2RequestError } from 'arctic';
import { AuthOAuthStatesTable } from '../../config/index.js';

export interface GoogleUserAttributes {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export class GoogleOAuthProvider extends BaseOAuthProvider {
  clientID!: string;
  clientSecret!: string;
  callbackURL!: string;
  scopes!: string[];
  redirect_url!: string;
  constructor(config: {
    clientID?: string;
    clientSecret?: string;
    callbackURL: string;
    scopes?: string[];
    userService: UserService;
    knex: Knex;
    name: string;
    redirect_url: string;
  }) {
    super(config);
  }

  private async getGoogleClient() {
    const config = await this.getConfig();
    return new arctic.Google(
      config.clientID,
      config.clientSecret,
      config.callbackURL,
    );
  }

  async getAuthorizationUrl(): Promise<URL> {
    try {
      const state = arctic.generateState();
      const codeVerifier = arctic.generateCodeVerifier();
      const config = await this.getConfig();
      const google = await this.getGoogleClient();
      const url = google.createAuthorizationURL(
        state,
        codeVerifier,
        config.scopes,
      );

      await this.config.knex(AuthOAuthStatesTable).insert({
        state,
        code_verifier: codeVerifier,
      });

      return url;
    } catch (error) {
      console.error('Error generating authorization URL:', error);
      throw error;
    }
  }

  async exchangeCode(
    code: string,
    state: string,
  ): Promise<{ accessToken: string }> {
    try {
      const { code_verifier, state: storedState } = await this.config
        .knex(AuthOAuthStatesTable)
        .where('state', state)
        .first();

      if (storedState === null || code_verifier === null) {
        throw new Error('Invalid OAuth request');
      }

      const google = await this.getGoogleClient();
      const tokens = await google.validateAuthorizationCode(
        code,
        code_verifier,
      );
      const accessToken = tokens.accessToken();

      await this.config
        .knex(AuthOAuthStatesTable)
        .where('state', state)
        .delete();

      return { accessToken };
    } catch (error: any) {
      if (error instanceof OAuth2RequestError) {
        throw new Error(error.message);
      }
      if (error instanceof ArcticFetchError) {
        throw new Error(error.message);
      }
      throw new Error(error.message);
    }
  }
  async getUserProfile(accessToken: string): Promise<OAuthUser> {
    try {
      const response = await axios(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const user: GoogleUserAttributes = response.data as GoogleUserAttributes;

      return {
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        emailVerified: user.email_verified,
        firstName: user.given_name,
        lastName: user.family_name,
        accessToken,
        data: user,
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
}
