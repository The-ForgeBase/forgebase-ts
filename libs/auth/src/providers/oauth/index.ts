export * from './basic';
export * from './google';
export * from './github';
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
