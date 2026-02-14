import type { DatabaseService } from './core/database';

import { ForgeDatabaseConfig, UserContext } from '@the-forgebase/database';

export interface BaaSConfig {
  prefix: string;
  auth: {
    enabled: boolean;
    exclude?: string[];
    beforeMiddleware?: boolean;
  };
  services: {
    // storage: {
    //   provider: 'local' | 's3' | 'gcp' | 'cloudinary';
    //   config:
    //     | LocalStorageConfig
    //     | S3StorageConfig
    //     | GCPStorageConfig
    //     | CloudinaryStorageConfig;
    // };
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
    // storage: StorageService;
    db: DatabaseService;
  };
}
