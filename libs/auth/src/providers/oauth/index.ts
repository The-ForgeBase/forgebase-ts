export * from './basic';

export interface OAuthUser {
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  accessToken: string;
}
