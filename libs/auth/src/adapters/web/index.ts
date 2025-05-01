import { AuthApi } from './endpoints/auth';
import { CorsOptions, RequestHandler, ResponseHandler } from 'itty-router';
import {
  AuthCradle,
  ContainerDependencies,
  createAuthContainer,
} from '../../container';
import { AwilixContainer } from 'awilix';

export type WebAuthConfig = {
  basePath?: string;
  cookieName?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    maxAge?: number;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
  };
  tokenExpiry?: string;
  jwtSecret?: string;
};

export type AuthClientConfig = {
  config: WebAuthConfig;
  deps: ContainerDependencies;
};

export const createWebAuthClient = (
  options: AuthClientConfig
): {
  container: AwilixContainer<AuthCradle>;
  config: WebAuthConfig;
} => {
  const container = createAuthContainer(options.deps);

  return {
    container,
    config: options.config,
  };
};

export const webAuthApi = (options: {
  container: AwilixContainer<AuthCradle>;
  config: WebAuthConfig;
  beforeMiddlewares?: RequestHandler[];
  finallyMiddlewares?: ResponseHandler[];
  cors: {
    enabled: boolean;
    corsOptions?: CorsOptions;
  };
}): AuthApi => {
  const api = new AuthApi({
    authManager: options.container.cradle.authManager,
    adminManager: options.container.cradle.adminManager,
    config: options.config,
    beforeMiddlewares: options.beforeMiddlewares,
    finallyMiddlewares: options.finallyMiddlewares,
    cors: options.cors,
  });

  return api;
};

export * from './endpoints';
export * from './utils/auth-utils';
