export interface RequestAdapter {
  getBody: <T>(request: any) => Promise<T>
  getQuery: (request: any) => Record<string, any>
  getParams: (request: any) => Record<string, any>
  getHeaders: (request: any) => Record<string, string>
}

export type SupportedFramework = 'express' | 'fastify' | 'hono'
