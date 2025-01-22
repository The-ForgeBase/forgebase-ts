import { ServerAdapter, AdapterFactory } from "../types";
import { SupportedFramework } from "../frameworks";
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { FastifyRequest, FastifyReply } from "fastify";
import { Context as HonoContext } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { UserContext } from "database";

class ExpressAdapter implements ServerAdapter {
  constructor(
    private req: ExpressRequest,
    private res: ExpressResponse
  ) {}

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

  setStatus(status: number): void {
    this.res.status(status);
  }

  setHeader(key: string, value: string): void {
    this.res.setHeader(key, value);
  }

  send(body: any): void {
    this.res.send(body);
  }

  getUserContext(): UserContext {
    return (this.req as any).userContext as UserContext;
  }
}

class FastifyAdapter implements ServerAdapter {
  constructor(
    private req: FastifyRequest,
    private reply: FastifyReply
  ) {}

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

  setStatus(status: number): void {
    this.reply.status(status);
  }

  setHeader(key: string, value: string): void {
    this.reply.header(key, value);
  }

  send(body: any): void {
    this.reply.send(body);
  }

  getUserContext(): UserContext {
    return (this.req as any).userContext as UserContext;
  }
}

class HonoAdapter implements ServerAdapter {
  constructor(private c: HonoContext) {}

  getMethod(): string {
    return this.c.req.method;
  }

  getPath(): string {
    return this.c.req.path;
  }

  getHeaders(): Record<string, any> {
    return Object.fromEntries(Object.entries(this.c.req.header()));
  }

  getQuery(): Record<string, any> {
    return Object.fromEntries(Object.entries(this.c.req.query()));
  }

  async getBody(): Promise<any> {
    return await this.c.req.json();
  }

  setStatus(status: number): void {
    this.c.status(status as StatusCode);
  }

  setHeader(key: string, value: string): void {
    this.c.header(key, value);
  }

  send(body: any): void {
    this.c.json(body);
  }

  getUserContext(): UserContext {
    return (this.c.req as any).userContext as UserContext;
  }
}

export const createAdapter: AdapterFactory["createAdapter"] = (
  framework: SupportedFramework
) => {
  return (req: any, res: any): ServerAdapter => {
    switch (framework) {
      case "express":
        return new ExpressAdapter(req, res);
      case "fastify":
        return new FastifyAdapter(req, res);
      case "hono":
        return new HonoAdapter(req);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  };
};
