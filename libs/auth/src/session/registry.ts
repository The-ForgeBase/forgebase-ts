import { SessionStorage } from '../session/manager';

export type StorageFactory = () => Promise<SessionStorage>;

export class StorageRegistry {
  private storageFactories = new Map<string, StorageFactory>();
  private activeStorage?: SessionStorage;

  registerStorage(type: string, factory: StorageFactory): void {
    this.storageFactories.set(type, factory);
  }

  async useStorage(type: string, options?: any): Promise<SessionStorage> {
    const factory = this.storageFactories.get(type);
    if (!factory) {
      throw new Error(`Storage type '${type}' not registered`);
    }

    this.activeStorage = await factory();
    return this.activeStorage;
  }

  getActiveStorage(): SessionStorage {
    if (!this.activeStorage) {
      throw new Error('No active storage configured');
    }
    return this.activeStorage;
  }
}

export const storageRegistry = new StorageRegistry();
