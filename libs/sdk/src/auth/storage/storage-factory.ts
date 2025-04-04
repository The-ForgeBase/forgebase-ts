import type { StorageAdapter } from './types';
import { BrowserStorageAdapter } from './browser-storage';

type StorageType = 'localStorage' | 'sessionStorage';

/**
 * Factory for creating storage adapters based on environment and configuration
 */
export class StorageFactory {
  /**
   * Create a storage adapter based on the environment and configuration
   */
  static createStorage(type: StorageType = 'localStorage'): StorageAdapter {
    // Use specified storage type on client side
    switch (type) {
      case 'localStorage':
      case 'sessionStorage':
        return new BrowserStorageAdapter(type);
      default:
        return new BrowserStorageAdapter('localStorage');
    }
  }
}
