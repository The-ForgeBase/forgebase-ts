import { UserContext } from '@the-forgebase/common';
import { BaseUser, AuthToken } from '../../../../types';
import { IRequest } from 'itty-router';
import { InternalAdmin } from '../../../../admin';

export type AuthRequest = {
  user?: Record<string, any> & BaseUser;
  userContext?: UserContext;
  token?: AuthToken | string;
  newToken?: AuthToken | string;
  isPublic: boolean;
  isSystem?: boolean;
  isAdmin?: boolean;
  isApiKeyAuth?: boolean;
  scopes: string[];
  adminApiKeyScopes: string[];
  admin?: InternalAdmin;

  [key: string]: any;
} & IRequest;
