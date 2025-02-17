type EventHandler = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.events.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

export interface AuthEventMap {
  'auth:config:updated': { config: any };
  'auth:provider:added': { type: string; config: any };
  'auth:provider:removed': { type: string };
  'auth:storage:changed': { type: string; options?: any };
  'auth:plugin:registered': { name: string };
  'auth:plugin:unregistered': { name: string };
  'auth:session:created': { sessionId: string; userId: string };
  'auth:session:destroyed': { sessionId: string };
  'auth:user:authenticated': { userId: string; provider: string };
  'auth:user:deauthenticated': { userId: string };
  'auth:signed_in': { userId: string; provider: string };
  'auth:signed_out': { userId: string };
  'auth:session_expired': { sessionId: string; userId: string };
  'auth:config_changed': { config: any };
  'auth:provider_added': { type: string; config: any };
  'auth:provider_removed': { type: string };
}

export type AuthEventName = keyof AuthEventMap;
export type AuthEventCallback<T extends AuthEventName> = (
  data: AuthEventMap[T]
) => void | Promise<void>;

export class TypedEventEmitter {
  private listeners = new Map<AuthEventName, Set<AuthEventCallback<any>>>();

  on<T extends AuthEventName>(
    event: T,
    callback: AuthEventCallback<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<T extends AuthEventName>(event: T, callback: AuthEventCallback<T>): void {
    this.listeners.get(event)?.delete(callback);
  }

  async emit<T extends AuthEventName>(
    event: T,
    data: AuthEventMap[T]
  ): Promise<void> {
    const callbacks = this.listeners.get(event) ?? new Set();
    await Promise.all(Array.from(callbacks).map((callback) => callback(data)));
  }

  clearListeners(): void {
    this.listeners.clear();
  }
}

export const authEvents = new TypedEventEmitter();

// Standard auth events
export const AUTH_EVENTS = {
  SIGNED_IN: 'auth:signed_in',
  SIGNED_OUT: 'auth:signed_out',
  SESSION_EXPIRED: 'auth:session_expired',
  CONFIG_CHANGED: 'auth:config_changed',
  PROVIDER_ADDED: 'auth:provider_added',
  PROVIDER_REMOVED: 'auth:provider_removed',
} as const;
