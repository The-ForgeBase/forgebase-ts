import { AuthStorage, StorageType } from './types';
import Cookies from 'js-cookie';
import { isSSR } from './utils';

/**
 * Storage keys used by the SDK
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'forgebase_access_token',
  REFRESH_TOKEN: 'forgebase_refresh_token',
  // USER key removed to prevent storing user data locally
};

/**
 * Cookie storage adapter
 */
export class CookieStorage implements AuthStorage {
  private domain?: string;
  private path?: string;
  private secure?: boolean;
  private sameSite?: 'strict' | 'lax' | 'none';

  constructor(
    options: {
      domain?: string;
      path?: string;
      secure?: boolean;
      httpOnly?: boolean; // Not stored but passed to Cookies.set
      sameSite?: 'strict' | 'lax' | 'none';
    } = {}
  ) {
    this.domain = options.domain;
    this.path = options.path || '/';
    this.secure = options.secure;
    this.sameSite = options.sameSite;
    // httpOnly is not stored as a property but used in the setItem method
  }

  setItem(
    key: string,
    value: string,
    options?: Cookies.CookieAttributes
  ): void {
    if (isSSR()) return;

    Cookies.set(key, value, {
      domain: this.domain,
      path: this.path,
      secure: this.secure,
      sameSite: this.sameSite,
      ...options,
    });
  }

  getItem(key: string): string | null {
    if (isSSR()) return null;

    return Cookies.get(key) || null;
  }

  removeItem(key: string, options?: Cookies.CookieAttributes): void {
    if (isSSR()) return;

    Cookies.remove(key, {
      domain: this.domain,
      path: this.path,
      ...options,
    });
  }
}

/**
 * LocalStorage adapter
 */
export class LocalStorage implements AuthStorage {
  setItem(key: string, value: string): void {
    if (isSSR()) return;

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('LocalStorage error:', error);
    }
  }

  getItem(key: string): string | null {
    if (isSSR()) return null;

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage error:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    if (isSSR()) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage error:', error);
    }
  }
}

/**
 * In-memory storage adapter
 */
export class MemoryStorage implements AuthStorage {
  private storage: Record<string, string> = {};

  setItem(key: string, value: string): void {
    this.storage[key] = value;
  }

  getItem(key: string): string | null {
    return this.storage[key] || null;
  }

  removeItem(key: string): void {
    delete this.storage[key];
  }
}

/**
 * Create a storage adapter based on the specified type
 */
export function createStorage(
  type: StorageType,
  options: {
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): AuthStorage {
  switch (type) {
    case StorageType.COOKIE:
      return new CookieStorage(options);
    case StorageType.LOCAL_STORAGE:
      return new LocalStorage();
    case StorageType.MEMORY:
    default:
      return new MemoryStorage();
  }
}
