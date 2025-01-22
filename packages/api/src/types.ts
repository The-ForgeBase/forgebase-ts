import type { Knex } from "knex";
import type { AuthService } from "./core/auth";
import type { DatabaseService } from "./core/database";
import type { StorageService } from "./core/storage";
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { UserContext } from "database";
import { SupportedFramework } from "./frameworks";

export interface BaaSConfig {
  prefix: string;
  auth: {
    enabled: boolean;
    exclude?: string[];
  };
  services: {
    storage: {
      provider: "local" | "s3" | "gcs";
      config?: Record<string, any>;
    };
    db: {
      provider: "sqlite" | "postgres" | "libsql";
      config?: Record<string, any>;
      knex?: Knex;
      realtime: boolean;
    };
  };
}

export type Context = {
  req: {
    params: Record<string, string>;
    query: Record<string, string>;
    body: any;
    headers: Record<string, string>;
    method: string;
    path: string;
    config: BaaSConfig;
    user: UserContext;
  };
  res: {
    body: any;
    status: number;
    headers: Record<string, string>;
  };
  services: {
    storage: StorageService;
    auth: AuthService;
    db: DatabaseService;
  };
};

export interface ExpressContext {
  req: {
    params: Record<string, string>;
    query: Record<string, any>;
    body: any;
    headers: Record<string, string | string[]>;
    method: string;
    path: string;
    config: BaaSConfig;
    user: UserContext;
    raw: ExpressRequest; // Access to underlying Express request if needed
  };
  res: {
    body: any;
    status: number;
    headers: Record<string, string | string[]>;
    raw: ExpressResponse; // Access to underlying Express response if needed
  };
  services: {
    storage: StorageService;
    auth: AuthService;
    db: DatabaseService;
  };
}

export type Handler = (ctx: Context | ExpressContext) => Promise<void>;

export type Route = {
  path: string;
  method: string;
  handler: Handler;
};

export interface ServerAdapter {
  getMethod(): string;
  getPath(): string;
  getHeaders(): Record<string, string>;
  getQuery(): Record<string, string>;
  getBody(): Promise<any>;
  setStatus(status: number): void;
  setHeader(key: string, value: string): void;
  send(body: any): void;
  getUserContext(): UserContext;
}

export interface AdapterFactory {
  createAdapter(
    framework: SupportedFramework
  ): (req: any, res: any) => ServerAdapter;
}
