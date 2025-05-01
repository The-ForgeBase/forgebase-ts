import { Request } from 'express';
import { CookieOptions } from 'express';

export type ExpressAuthConfig = {
  basePath?: string;
  cookieName?: string;
  cookieOptions?: CookieOptions;
  tokenExpiry?: string;
  jwtSecret?: string;
};

export interface ExpressAuthRequest extends Request {
  user?: any;
  userContext?: any;
  token?: any;
  newToken?: any;
  isPublic?: boolean;
  isSystem?: boolean;
  isAdmin?: boolean;
  isApiKeyAuth?: boolean;
  scopes?: string[];
  adminApiKeyScopes?: string[];
  admin?: any;
}
