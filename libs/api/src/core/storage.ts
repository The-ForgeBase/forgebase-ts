import { BaaSConfig } from '../types';
import { StorageService as BaseStorageService } from '@forgebase-ts/storage';

export class StorageService extends BaseStorageService {
  constructor(config?: BaaSConfig['services']['storage']) {
    super(config || { provider: 'local', config: { rootDir: './storage' } });
  }
}
