import { BaseUser, AuthToken } from '../../../../types';
import { IRequest } from 'itty-router';

export type AuthRequest = {
  user?: Record<string, any> & BaseUser;
  token?: AuthToken | string;
  newToken?: AuthToken | string;
  isPublic: boolean;
  [key: string]: any;
} & IRequest;
