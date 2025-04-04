import { StorageAdapter } from './types';

/**
 * Browser storage adapter that uses localStorage or sessionStorage
 */
export class BrowserStorageAdapter implements StorageAdapter {
  constructor(
    private type: 'localStorage' | 'sessionStorage' = 'localStorage'
  ) {}

  private get storage(): Storage {
    return this.type === 'localStorage' ? localStorage : sessionStorage;
  }

  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return this.storage.getItem(key);
  }

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    this.storage.setItem(key, value);
  }

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    this.storage.removeItem(key);
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    this.storage.clear();
  }
}
