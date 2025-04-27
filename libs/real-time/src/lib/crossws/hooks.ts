import type { AdapterOptions } from './adapter';
import type { WSError } from './error';
import type { Connect } from './connect';
import { Message } from './message';

export class AdapterHookable {
  options: AdapterOptions;

  constructor(options?: AdapterOptions) {
    this.options = options || {};
  }

  callHook<N extends keyof Hooks>(
    name: N,
    arg1: Parameters<Hooks[N]>[0],
    arg2?: Parameters<Hooks[N]>[1]
  ): MaybePromise<ReturnType<Hooks[N]>> {
    // Call global hook first
    const globalHook = this.options.hooks?.[name];
    const globalPromise = globalHook?.(arg1 as any, arg2 as any);

    // Resolve hooks for request
    const resolveHooksPromise = this.options.resolve?.(arg1);
    if (!resolveHooksPromise) {
      return globalPromise as any; // Fast path: no hooks to resolve
    }
    const resolvePromise =
      resolveHooksPromise instanceof Promise
        ? resolveHooksPromise.then((hooks) => hooks?.[name])
        : resolveHooksPromise?.[name];

    // In parallel, call global hook and resolve hook implementation
    return Promise.all([globalPromise, resolvePromise]).then(
      ([globalRes, hook]) => {
        const hookResPromise = hook?.(arg1 as any, arg2 as any);
        return hookResPromise instanceof Promise
          ? hookResPromise.then((hookRes) => hookRes || globalRes)
          : hookResPromise || globalRes;
      }
    ) as Promise<any>;
  }

  async upgrade(
    request: UpgradeRequest & { readonly context?: Connect['context'] }
  ): Promise<{
    upgradeHeaders?: HeadersInit;
    endResponse?: Response;
    context: Connect['context'];
  }> {
    let context = request.context;
    if (!context) {
      context = {};
      Object.defineProperty(request, 'context', {
        enumerable: true,
        value: context,
      });
    }

    try {
      const res = await this.callHook(
        'upgrade',
        request as UpgradeRequest & { context: Connect['context'] }
      );
      if (!res) {
        return { context };
      }
      if ((res as Response).ok === false) {
        return { context, endResponse: res as Response };
      }
      if (res.headers) {
        return {
          context,
          upgradeHeaders: res.headers,
        };
      }
    } catch (error) {
      const errResponse = (error as { response: Response }).response || error;
      if (errResponse instanceof Response) {
        return {
          context,
          endResponse: errResponse,
        };
      }
      throw error;
    }
    return { context };
  }
}

// --- types ---

export function defineHooks<T extends Partial<Hooks> = Partial<Hooks>>(
  hooks: T
): T {
  return hooks;
}

export type ResolveHooks = (
  info: RequestInit | Connect
) => Partial<Hooks> | Promise<Partial<Hooks>>;

export type MaybePromise<T> = T | Promise<T>;

export type UpgradeRequest =
  | Request
  | {
      url: string;
      headers: Headers;
    };

export type UpgradeError = Response | { readonly response: Response };

export interface Hooks {
  /** Upgrading */
  /**
   *
   * @param request
   * @throws {Response}
   */
  upgrade: (
    request: UpgradeRequest & { context: Connect['context'] }
  ) => MaybePromise<Response | ResponseInit | void>;

  /** A socket is opened */
  open: (conn: Connect) => MaybePromise<void>;

  /** A message is received */
  message: (peer: Connect, message: Message) => MaybePromise<void>;

  /** A socket is closed */
  close: (
    conn: Connect,
    details: { code?: number; reason?: string }
  ) => MaybePromise<void>;

  /** An error occurs */
  error: (conn: Connect, error: WSError) => MaybePromise<void>;
}
