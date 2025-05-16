import { InternalAdmin } from '../../../../types/admin';
import { IRequest } from 'itty-router';

export type AdminRequest = {
  admin?: InternalAdmin;
  isApiKeyAuth?: boolean;
  adminApiKeyScopes: string[];
  isPublic: boolean;
  scopes: string[];
  [key: string]: any;
} & IRequest;
