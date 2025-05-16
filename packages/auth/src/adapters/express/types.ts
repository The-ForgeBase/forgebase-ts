import { InternalAdmin } from '../../types/admin';
import { AuthToken, User } from '../../types';
import { UserContext } from '@the-forgebase/common';
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
