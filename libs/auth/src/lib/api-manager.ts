import { z } from 'zod';
import { AuthError, AUTH_ERROR_CODES } from './errors';

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  version: number;
  handler: (req: any, context: APIContext) => Promise<any>;
  middleware?: APIMiddleware[];
  rateLimit?: {
    points: number;
    duration: number;
  };
}

export interface APIContext {
  tenantId?: string;
  userId?: string;
  version: number;
  metadata: Record<string, any>;
}

export type APIMiddleware = (
  req: any,
  context: APIContext,
  next: () => Promise<any>
) => Promise<any>;

export class APIManager {
  private endpoints = new Map<string, Map<number, APIEndpoint>>();
  private globalMiddleware: APIMiddleware[] = [];

  registerEndpoint(endpoint: APIEndpoint): void {
    const key = `${endpoint.method} ${endpoint.path}`;
    if (!this.endpoints.has(key)) {
      this.endpoints.set(key, new Map());
    }
    this.endpoints.get(key)!.set(endpoint.version, endpoint);
  }

  useMiddleware(middleware: APIMiddleware): void {
    this.globalMiddleware.push(middleware);
  }

  async handleRequest(
    req: {
      method: string;
      path: string;
      version: number;
      body?: any;
      query?: Record<string, string>;
      headers: Record<string, string>;
    },
    context: Omit<APIContext, 'version'>
  ): Promise<any> {
    const key = `${req.method} ${req.path}`;
    const versionMap = this.endpoints.get(key);

    if (!versionMap) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_REQUEST,
        `Endpoint not found: ${key}`,
        404
      );
    }

    // Find the appropriate version handler
    const endpoint = this.findVersionHandler(versionMap, req.version);
    if (!endpoint) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_REQUEST,
        `Version ${req.version} not supported for ${key}`,
        400
      );
    }

    const apiContext: APIContext = {
      ...context,
      version: req.version,
    };

    // Combine global and endpoint-specific middleware
    const middleware = [
      ...this.globalMiddleware,
      ...(endpoint.middleware || []),
    ];

    // Execute middleware chain
    let index = 0;
    const next = async (): Promise<any> => {
      if (index < middleware.length) {
        const currentMiddleware = middleware[index++];
        return currentMiddleware(req, apiContext, next);
      } else {
        return endpoint.handler(req, apiContext);
      }
    };

    return next();
  }

  private findVersionHandler(
    versionMap: Map<number, APIEndpoint>,
    requestedVersion: number
  ): APIEndpoint | undefined {
    // Find exact version match
    if (versionMap.has(requestedVersion)) {
      return versionMap.get(requestedVersion);
    }

    // Find highest compatible version
    const versions = Array.from(versionMap.keys()).sort((a, b) => b - a);
    const compatibleVersion = versions.find((v) => v <= requestedVersion);

    return compatibleVersion !== undefined
      ? versionMap.get(compatibleVersion)
      : undefined;
  }

  getEndpoints(): { path: string; method: string; versions: number[] }[] {
    return Array.from(this.endpoints.entries()).map(([key, versionMap]) => {
      const [method, path] = key.split(' ');
      return {
        path,
        method,
        versions: Array.from(versionMap.keys()).sort(),
      };
    });
  }
}

// Export common middleware
export const commonMiddleware = {
  validateTenant: (): APIMiddleware => async (req, context, next) => {
    if (!context.tenantId) {
      throw new AuthError(
        AUTH_ERROR_CODES.UNAUTHORIZED,
        'Tenant ID is required',
        401
      );
    }
    return next();
  },

  requireAuth: (): APIMiddleware => async (req, context, next) => {
    if (!context.userId) {
      throw new AuthError(
        AUTH_ERROR_CODES.UNAUTHORIZED,
        'Authentication required',
        401
      );
    }
    return next();
  },

  validateSchema:
    (schema: z.ZodType): APIMiddleware =>
    async (req, context, next) => {
      try {
        if (req.body) {
          req.body = schema.parse(req.body);
        }
        return next();
      } catch (error) {
        throw new AuthError(
          AUTH_ERROR_CODES.INVALID_REQUEST,
          'Invalid request data',
          400,
          error
        );
      }
    },
};
