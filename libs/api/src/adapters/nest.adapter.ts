import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ServerAdapter } from '../types';
import { UserContext } from '@forgebase-ts/database';

@Injectable()
export class NestAdapter implements ServerAdapter {
  constructor(private req: Request) {}
    getUserContext(): UserContext {
        return (this.req as any).user as UserContext;
    }

  getMethod(): string {
    return this.req.method;
  }

  getPath(): string {
    return this.req.path;
  }

  getHeaders(): Record<string, string> {
    return this.req.headers as Record<string, string>;
  }

  getQuery(): Record<string, string> {
    return this.req.query as Record<string, string>;
  }

  getBody():  Promise<any> {
    return this.req.body;
  }
  
}