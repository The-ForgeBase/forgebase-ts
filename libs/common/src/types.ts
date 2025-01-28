export type SupportedFramework = 'express' | 'fastify' | 'hono';

export interface ServerAdapter {
  getMethod(): string;
  getPath(): string;
  getHeaders(): Record<string, string>;
  getQuery(): Record<string, string>;
  getBody(): Promise<any>;
  //   getUserContext(): UserContext;
}

export interface AdapterFactory {
  createAdapter(
    framework: SupportedFramework
  ): (req: any, res: any) => ServerAdapter;
}
