import knex from 'knex';
import type { DatabaseService } from './core/database';
import type { StorageService } from './core/storage';

import { ForgeDatabaseConfig, UserContext } from '@forgebase-ts/database';
import { SupportedFramework } from './frameworks/index';
import {
  LocalStorageConfig,
  S3StorageConfig,
  GCPStorageConfig,
  CloudinaryStorageConfig,
} from '@forgebase-ts/storage';

export interface BaaSConfig {
  prefix: string;
  auth: {
    enabled: boolean;
    exclude?: string[];
    beforeMiddleware?: boolean;
  };
  services: {
    storage: {
      provider: 'local' | 's3' | 'gcp' | 'cloudinary';
      config:
        | LocalStorageConfig
        | S3StorageConfig
        | GCPStorageConfig
        | CloudinaryStorageConfig;
    };
    db: {
      provider: 'sqlite' | 'postgres' | 'libsql';
      config: ForgeDatabaseConfig;
    };
  };
  api?: {
    adminReqName?: string;
  };
}

export interface Context {
  req: {
    params: Record<string, any>;
    query: Record<string, any>;
    body: any;
    headers: Record<string, any>;
    method: string;
    path: string;
    config: BaaSConfig;
    userContext?: UserContext;
    isSystem?: boolean; // Add isSystem flag to request context
  };
  res: {
    body: any;
    status: number;
    headers: Record<string, any>;
  };
  services: {
    storage: StorageService;
    db: DatabaseService;
  };
}

export type Handler = (ctx: Context) => Promise<void>;

export type Route = {
  path: string;
  method: string;
  handler: Handler;
};

export interface ServerAdapter {
  getMethod(): string;
  getPath(): string;
  getHeaders(): Record<string, string>;
  getQuery(): Record<string, string>;
  getBody(): Promise<any>;
  getUserContext(): UserContext;
}

export interface AdapterFactory {
  createAdapter(
    framework: SupportedFramework
  ): (req: any, res: any) => ServerAdapter;
}
