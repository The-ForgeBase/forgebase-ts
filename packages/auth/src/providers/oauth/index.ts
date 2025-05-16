export * from './basic.js';
export * from './google.js';
export * from './github.js';
// export * from './microsoft';

export interface OAuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  accessToken: string;
  data: any;
}
