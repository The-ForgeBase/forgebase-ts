import { AuthStorage } from './types';

/**
 * Storage keys used by the SDK
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@forgebase_access_token',
  REFRESH_TOKEN: '@forgebase_refresh_token',
  USER: '@forgebase_user'
};

/**
 * SecureStore adapter for React Native/Expo
 * This adapter works with Expo's SecureStore or any compatible API
 */
export class SecureStoreAdapter implements AuthStorage {
  private secureStore: any;
  
  /**
   * Create a new SecureStoreAdapter
   * @param secureStore Instance of SecureStore or compatible API
   */
  constructor(secureStore: any) {
    this.secureStore = secureStore;
  }
  
  /**
   * Store a value securely
   * @param key Storage key
   * @param value Value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.secureStore.setItemAsync(key, value);
  }
  
  /**
   * Retrieve a stored value
   * @param key Storage key
   * @returns The stored value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    return await this.secureStore.getItemAsync(key);
  }
  
  /**
   * Remove a stored value
   * @param key Storage key
   */
  async removeItem(key: string): Promise<void> {
    await this.secureStore.deleteItemAsync(key);
  }
}

/**
 * In-memory storage adapter for testing
 * This adapter stores values in memory and is not secure
 * Only use for testing purposes
 */
export class MemoryStorageAdapter implements AuthStorage {
  private storage: Record<string, string> = {};
  
  async setItem(key: string, value: string): Promise<void> {
    this.storage[key] = value;
  }
  
  async getItem(key: string): Promise<string | null> {
    return this.storage[key] || null;
  }
  
  async removeItem(key: string): Promise<void> {
    delete this.storage[key];
  }
}
