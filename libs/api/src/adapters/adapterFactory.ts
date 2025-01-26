import { ServerAdapter } from '../types';
import { Request as ExpressRequest } from 'express';
import { FastifyRequest } from 'fastify';
import { Context as HonoContext } from 'hono';
import { UserContext } from '@forgebase-ts/database';

export class ExpressAdapter implements ServerAdapter {
  constructor(private req: ExpressRequest) {}

  getMethod(): string {
    return this.req.method;
  }

  getPath(): string {
    return this.req.path;
  }

  getHeaders(): Record<string, any> {
    return this.req.headers as Record<string, any>;
  }

  getQuery(): Record<string, any> {
    return this.req.query as Record<string, any>;
  }

  async getBody(): Promise<any> {
    return this.req.body;
  }

  getUserContext(): UserContext {
    return (this.req as any).userContext as UserContext;
  }
}

export class FastifyAdapter implements ServerAdapter {
  constructor(private req: FastifyRequest) {}

  getMethod(): string {
    return this.req.method;
  }

  getPath(): string {
    return this.req.url;
  }

  getHeaders(): Record<string, any> {
    return this.req.headers as Record<string, any>;
  }

  getQuery(): Record<string, any> {
    return this.req.query as Record<string, any>;
  }

  async getBody(): Promise<any> {
    return this.req.body;
  }

  getUserContext(): UserContext {
    return (this.req as any).userContext as UserContext;
  }
}

export class HonoAdapter implements ServerAdapter {
  constructor(private c: HonoContext) {}

  getMethod(): string {
    return this.c.req.method;
  }

  getPath(): string {
    // Fix: Use pathname instead of path to get the correct URL path
    return new URL(this.c.req.url).pathname;
  }

  getHeaders(): Record<string, any> {
    return Object.fromEntries(Object.entries(this.c.req.header()));
  }

  getQuery(): Record<string, any> {
    return Object.fromEntries(Object.entries(this.c.req.query()));
  }

  async getBody(): Promise<any> {
    return await this.c.req.parseBody();
  }

  getUserContext(): UserContext {
    return (this.c.req as any).userContext as UserContext;
  }
}
