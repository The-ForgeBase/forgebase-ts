import { BaaSConfig } from '../../types';
import { DatabaseService } from '../database';
import { StorageService } from '../storage';

export class ForgeApiService {
  private config: BaaSConfig;

  constructor(
    config: Partial<BaaSConfig>,
    private readonly storage: StorageService,
    private readonly db: DatabaseService
  ) {
    this.config = {
      prefix: '',
      auth: {
        enabled: false,
        exclude: ['/auth/login', '/auth/register'],
      },
      services: {
        storage: {
          provider: 'local',
          config: {},
        },
        db: {
          provider: 'sqlite',
          config: {
            realtime: true,
            enforceRls: true,
          },
        },
      },
      ...config,
    };

    this.config = this.mergeConfigs(this.config, config);
    console.log('Initializing Forge API with config:', this.config);
  }

  private mergeConfigs(
    defaultConfig: BaaSConfig,
    userConfig: Partial<BaaSConfig>
  ): BaaSConfig {
    return {
      ...defaultConfig,
      ...userConfig,
      auth: {
        ...defaultConfig.auth,
        ...userConfig.auth,
      },
      services: {
        storage: {
          ...defaultConfig.services.storage,
          ...userConfig.services?.storage,
        },
        db: {
          ...defaultConfig.services.db,
          ...userConfig.services?.db,
        },
      },
    };
  }

  getStorageService(): StorageService {
    return this.storage;
  }

  getDatabaseService(): DatabaseService {
    return this.db;
  }

  getConfig(): BaaSConfig {
    return this.config;
  }
}
