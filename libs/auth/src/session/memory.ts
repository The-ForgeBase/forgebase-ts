import { SessionStorage } from './manager';

interface StoredSession {
  data: any;
  expiresAt: number;
}

export class InMemorySessionStorage implements SessionStorage {
  private sessions = new Map<string, StoredSession>();
  private cleanupInterval: NodeJS.Timer;

  constructor(cleanupIntervalMs: number = 60000) {
    // Default cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  async get(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }

  async set(sessionId: string, data: any, ttl: number = 86400): Promise<void> {
    this.sessions.set(sessionId, {
      data,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async touch(sessionId: string, ttl: number = 86400): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.expiresAt = Date.now() + ttl * 1000;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }
}
