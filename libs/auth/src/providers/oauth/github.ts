import * as arctic from 'arctic';
import { BaseOAuthProvider } from './basic';
import { User, UserService } from '../../types';
import { Knex } from 'knex';
import axios from 'axios';
import { OAuthUser } from '.';
import { ArcticFetchError, OAuth2RequestError } from 'arctic';

export interface GitHubUserAttributes {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export class GitHubOAuthProvider<
  TUser extends User
> extends BaseOAuthProvider<TUser> {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scopes: string[];
  constructor(config: {
    clientID?: string;
    clientSecret?: string;
    callbackURL: string;
    scopes?: string[];
    userService: UserService<TUser>;
    knex: Knex;
    name: string;
  }) {
    super(config);
  }

  private async getGitHubClient() {
    const config = await this.getConfig();
    return new arctic.GitHub(
      config.clientID,
      config.clientSecret,
      config.callbackURL
    );
  }

  async getAuthorizationUrl(): Promise<URL> {
    try {
      const state = arctic.generateState();
      const codeVerifier = arctic.generateCodeVerifier();
      const config = await this.getConfig();
      const github = await this.getGitHubClient();
      const url = github.createAuthorizationURL(
        state,
        config.scopes
      );

      await this.config.knex('oauth_states').insert({
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
    state: string
  ): Promise<{ accessToken: string }> {
    try {
      const { code_verifier, state: storedState } = await this.config
        .knex('oauth_states')
        .where('state', state)
        .first();

      if (storedState === null || code_verifier === null) {
        throw new Error('Invalid OAuth request');
      }

      const github = await this.getGitHubClient();
      const tokens = await github.validateAuthorizationCode(
        code,
      );
      const accessToken = tokens.accessToken();

      await this.config.knex('oauth_states').where('state', state).delete();

      return { accessToken };
    } catch (error) {
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
      // Get user data
      const response = await axios('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const userData: GitHubUserAttributes = response.data;
      
      // Get user email if not provided in profile
      let email = userData.email;
      if (!email) {
        const emailsResponse = await axios('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        
        // Find primary email
        const primaryEmail = emailsResponse.data.find((e: any) => e.primary);
        if (primaryEmail) {
          email = primaryEmail.email;
        } else if (emailsResponse.data.length > 0) {
          email = emailsResponse.data[0].email;
        }
      }

      return {
        id: userData.id.toString(),
        email: email,
        name: userData.name || userData.login,
        picture: userData.avatar_url,
        emailVerified: true, // GitHub emails are verified
        accessToken,
        data: userData,
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
}