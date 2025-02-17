export interface SyncMessage {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
  origin: string;
  version: number;
}

export interface SyncAdapter {
  publish(channel: string, message: SyncMessage): Promise<void>;
  subscribe(
    channel: string,
    callback: (message: SyncMessage) => Promise<void>
  ): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
}

export class ConfigSynchronizer {
  private instanceId: string;
  private version: number = 0;
  private adapter?: SyncAdapter;
  private handlers = new Map<string, Set<(payload: any) => Promise<void>>>();

  constructor(instanceId?: string) {
    this.instanceId = instanceId || crypto.randomUUID();
  }

  setAdapter(adapter: SyncAdapter): void {
    this.adapter = adapter;
    this.setupChannels();
  }

  private async setupChannels(): Promise<void> {
    if (!this.adapter) return;

    await this.adapter.subscribe('auth:config', async (message) => {
      if (message.origin === this.instanceId) return; // Ignore own messages
      if (message.version <= this.version) return; // Ignore older versions

      this.version = message.version;
      await this.notifyHandlers(message.type, message.payload);
    });
  }

  async publish(type: string, payload: any): Promise<void> {
    if (!this.adapter) return;

    this.version++;
    const message: SyncMessage = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      payload,
      origin: this.instanceId,
      version: this.version,
    };

    await this.adapter.publish('auth:config', message);
    await this.notifyHandlers(type, payload);
  }

  on(type: string, handler: (payload: any) => Promise<void>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private async notifyHandlers(type: string, payload: any): Promise<void> {
    const handlers = this.handlers.get(type);
    if (!handlers) return;

    await Promise.all(Array.from(handlers).map((handler) => handler(payload)));
  }
}

// In-memory sync adapter for single-instance testing
export class InMemorySyncAdapter implements SyncAdapter {
  private callbacks = new Map<
    string,
    Set<(message: SyncMessage) => Promise<void>>
  >();

  async publish(channel: string, message: SyncMessage): Promise<void> {
    const handlers = this.callbacks.get(channel);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map((callback) => callback(message))
    );
  }

  async subscribe(
    channel: string,
    callback: (message: SyncMessage) => Promise<void>
  ): Promise<void> {
    if (!this.callbacks.has(channel)) {
      this.callbacks.set(channel, new Set());
    }
    this.callbacks.get(channel)!.add(callback);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.callbacks.delete(channel);
  }
}
