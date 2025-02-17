export interface RateLimitOptions {
  points: number; // Number of requests allowed
  duration: number; // Time window in seconds
  blockDuration?: number; // How long to block after limit is exceeded (seconds)
}

export interface RateLimitInfo {
  remaining: number; // Points remaining
  reset: number; // Timestamp when points reset
  blocked?: boolean; // Whether the key is currently blocked
}

export class RateLimiter {
  private stores = new Map<string, Map<string, RateLimitInfo>>();
  private options: Map<string, RateLimitOptions> = new Map();
  private cleanupInterval: NodeJS.Timer;

  constructor(cleanupIntervalMs: number = 60000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  setOptions(key: string, options: RateLimitOptions): void {
    this.options.set(key, options);
  }

  async consume(key: string, identifier: string): Promise<RateLimitInfo> {
    const options = this.options.get(key);
    if (!options) {
      throw new Error(`No rate limit options configured for key: ${key}`);
    }

    if (!this.stores.has(key)) {
      this.stores.set(key, new Map());
    }
    const store = this.stores.get(key)!;

    const now = Date.now();
    const info = store.get(identifier) || {
      remaining: options.points,
      reset: now + options.duration * 1000,
      blocked: false,
    };

    // Check if blocked
    if (info.blocked && now < info.reset) {
      return info;
    }

    // Reset if time window has passed
    if (now > info.reset) {
      info.remaining = options.points;
      info.reset = now + options.duration * 1000;
      info.blocked = false;
    }

    // Check remaining points
    if (info.remaining <= 0) {
      info.blocked = true;
      info.reset = now + (options.blockDuration || options.duration) * 1000;
      store.set(identifier, info);
      return info;
    }

    // Consume a point
    info.remaining--;
    store.set(identifier, info);
    return info;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, store] of this.stores.entries()) {
      for (const [identifier, info] of store.entries()) {
        if (now > info.reset && !info.blocked) {
          store.delete(identifier);
        }
      }
      if (store.size === 0) {
        this.stores.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.stores.clear();
    this.options.clear();
  }
}
