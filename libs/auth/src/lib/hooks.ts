export type HookContext = {
  type: string;
  userId?: string;
  sessionId?: string;
  data: Record<string, any>;
};

export type HookFunction = (context: HookContext) => Promise<void>;

export type HookPoint =
  | 'pre:authenticate'
  | 'post:authenticate'
  | 'pre:logout'
  | 'post:logout'
  | 'pre:session:create'
  | 'post:session:create'
  | 'pre:session:destroy'
  | 'post:session:destroy';

export class HookManager {
  private hooks = new Map<HookPoint, Set<HookFunction>>();

  addHook(point: HookPoint, fn: HookFunction): () => void {
    if (!this.hooks.has(point)) {
      this.hooks.set(point, new Set());
    }
    this.hooks.get(point)!.add(fn);
    return () => this.removeHook(point, fn);
  }

  removeHook(point: HookPoint, fn: HookFunction): void {
    this.hooks.get(point)?.delete(fn);
  }

  async executeHooks(point: HookPoint, context: HookContext): Promise<void> {
    const hooks = this.hooks.get(point);
    if (!hooks) return;

    for (const hook of hooks) {
      try {
        await hook(context);
      } catch (error) {
        console.error(`Error executing ${point} hook:`, error);
        throw error;
      }
    }
  }

  clearHooks(point?: HookPoint): void {
    if (point) {
      this.hooks.delete(point);
    } else {
      this.hooks.clear();
    }
  }
}

export const hookManager = new HookManager();
