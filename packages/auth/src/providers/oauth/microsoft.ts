// import * as arctic from 'arctic';
// import { BaseOAuthProvider } from './basic';
// import { User, UserService } from '../../types';
// import { Knex } from 'knex';
// import axios from 'axios';
// import { OAuthUser } from '.';
// import { ArcticFetchError, OAuth2RequestError } from 'arctic';

// export interface MicrosoftUserAttributes {
//   id: string;
//   displayName: string;
//   givenName: string;
//   surname: string;
//   userPrincipalName: string;
//   mail: string;
//   businessPhones: string[];
//   jobTitle: string;
//   mobilePhone: string;
//   officeLocation: string;
//   preferredLanguage: string;
// }

// export class MicrosoftOAuthProvider<
//   TUser extends User
// > extends BaseOAuthProvider<TUser> {
//   clientID: string;
//   clientSecret: string;
//   callbackURL: string;
//   scopes: string[];
//   constructor(config: {
//     clientID?: string;
//     clientSecret?: string;
//     callbackURL: string;
//     scopes?: string[];
//     userService: UserService<TUser>;
//     knex: Knex;
//     name: string;
//   }) {
//     super(config);
//   }

//   private async getMicrosoftClient() {
//     const config = await this.getConfig();
//     return new arctic.Microsoft(
//       config.clientID,
//       config.clientSecret,
//       config.callbackURL
//     );
//   }

//   async getAuthorizationUrl(): Promise<URL> {
//     try {
//       const state = arctic.generateState();
//       const codeVerifier = arctic.generateCodeVerifier();
//       const config = await this.getConfig();
//       const microsoft = await this.getMicrosoftClient();
//       const url = microsoft.createAuthorizationURL(
//         state,
//         codeVerifier,
//         config.scopes
//       );

//       await this.config.knex('oauth_states').insert({
//         state,
//         code_verifier: codeVerifier,
//       });

//       return url;
//     } catch (error) {
//       console.error('Error generating authorization URL:', error);
//       throw error;
//     }
//   }

//   async exchangeCode(
//     code: string,
//     state: string
//   ): Promise<{ accessToken: string }> {
//     try {
//       const { code_verifier, state: storedState } = await this.config
//         .knex('oauth_states')
//         .where('state', state)
//         .first();

//       if (storedState === null || code_verifier === null) {
//         throw new Error('Invalid OAuth request');
//       }

//       const microsoft = await this.getMicrosoftClient();
//       const tokens = await microsoft.validateAuthorizationCode(
//         code,
//         code_verifier
//       );
//       const accessToken = tokens.accessToken();

//       await this.config.knex('oauth_states').where('state', state).delete();

//       return { accessToken };
//     } catch (error) {
//       if (error instanceof OAuth2RequestError) {
//         throw new Error(error.message);
//       }
//       if (error instanceof ArcticFetchError) {
//         throw new Error(error.message);
//       }
//       throw new Error(error.message);
//     }
//   }

//   async getUserProfile(accessToken: string): Promise<OAuthUser> {
//     try {
//       const response = await axios('https://graph.microsoft.com/v1.0/me', {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       });

//       const userData: MicrosoftUserAttributes = response.data;

//       return {
//         id: userData.id,
//         email: userData.mail || userData.userPrincipalName,
//         name: userData.displayName,
//         picture: `https://graph.microsoft.com/v1.0/me/photo/$value`, // Requires additional permission
//         emailVerified: true, // Microsoft emails are typically verified
//         firstName: userData.givenName,
//         lastName: userData.surname,
//         accessToken,
//         data: userData,
//       };
//     } catch (error) {
//       console.error('Error getting user profile:', error);
//       throw error;
//     }
//   }
// }
