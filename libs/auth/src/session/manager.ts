export interface SessionStorage {
  get(sessionId: string): Promise<any>;
  set(sessionId: string, data: any, ttl?: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  touch(sessionId: string, ttl?: number): Promise<void>;
}

export interface SessionOptions {
  ttl?: number;
  rolling?: boolean;
  autoTouch?: boolean;
}

export class SessionManager {
  private storage: SessionStorage;
  private options: Required<SessionOptions>;

  constructor(storage: SessionStorage, options: SessionOptions = {}) {
    this.storage = storage;
    this.options = {
      ttl: 86400, // 24 hours
      rolling: true,
      autoTouch: true,
      ...options,
    };
  }

  async getSession(sessionId: string): Promise<any> {
    const session = await this.storage.get(sessionId);
    if (session && this.options.autoTouch && this.options.rolling) {
      await this.touchSession(sessionId);
    }
    return session;
  }

  async setSession(sessionId: string, data: any, ttl?: number): Promise<void> {
    await this.storage.set(sessionId, data, ttl ?? this.options.ttl);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.storage.touch(sessionId, this.options.ttl);
  }
}
