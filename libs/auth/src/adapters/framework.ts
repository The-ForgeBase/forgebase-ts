export interface AuthFrameworkAdapter {
  getRequestData: (req: unknown) => Promise<{
    headers: Record<string, string>;
    cookies: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  }>;

  setResponseData: (
    res: unknown,
    data: {
      headers?: Record<string, string>;
      cookies?: Array<{
        name: string;
        value: string;
        options?: Record<string, any>;
      }>;
      status?: number;
      body?: unknown;
    }
  ) => Promise<void>;

  createError: (status: number, message: string) => Error;
}

export class AdapterManager {
  private adapter: AuthFrameworkAdapter | null = null;

  setAdapter(adapter: AuthFrameworkAdapter) {
    this.adapter = adapter;
  }

  getAdapter(): AuthFrameworkAdapter {
    if (!this.adapter) {
      throw new Error(
        'No adapter set. Please configure an adapter before using auth features.'
      );
    }
    return this.adapter;
  }
}

export const adapterManager = new AdapterManager();
