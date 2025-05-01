import { InternalAdmin } from '../../types/admin';
import { AuthToken, User } from '../../types';
import { UserContext } from '@forgebase-ts/database';
import { Request, CookieOptions } from 'ultimate-express';

export type UltimateExpressAuthConfig = {
  basePath?: string;
  cookieName?: string;
  cookieOptions?: CookieOptions;
  tokenExpiry?: string;
  jwtSecret?: string;
};

export interface UltimateExpressAuthRequest extends Request {
  user?: User;
  userContext?: UserContext;
  token?: string | AuthToken;
  newToken?: string | AuthToken;
  isPublic?: boolean;
  isSystem?: boolean;
  isAdmin?: boolean;
  isApiKeyAuth?: boolean;
  scopes?: string[];
  adminApiKeyScopes?: string[];
  admin?: InternalAdmin;
}
