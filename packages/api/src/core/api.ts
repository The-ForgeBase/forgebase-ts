import { DataQueryParams } from "database";
import { BaaSConfig, Context, Handler, ServerAdapter } from "../types";
import { AuthService } from "./auth";
import { DatabaseService } from "./database";
import { StorageService } from "./storage";

export class Api {
  private routes: Map<string, Map<string, Handler>>;
  private storage: StorageService;
  private auth: AuthService;
  private db: DatabaseService;
  private config: BaaSConfig;
  private middlewares: Handler[] = [];

  constructor(config: Partial<BaaSConfig> = {}) {
    this.config = {
      prefix: "/api/baas",
      auth: {
        enabled: false,
        exclude: ["/auth/login", "/auth/register"],
      },
      services: {
        storage: {
          provider: "local",
        },
        db: {
          provider: "sqlite",
          realtime: true,
        },
      },
      ...config,
    };

    // Merge the provided config with the default config
    this.config = this.mergeConfigs(this.config, config);

    this.routes = new Map();
    // Initialize services based on configuration
    this.storage = new StorageService(this.config.services?.storage);
    this.auth = new AuthService(this.config.auth);
    this.db = new DatabaseService(this.config.services?.db);
    this.registerCoreRoutes();
  }
  private mergeConfigs(
    defaultConfig: BaaSConfig,
    userConfig: Partial<BaaSConfig>
  ): BaaSConfig {
    return {
      ...defaultConfig,
      ...userConfig,
      auth: {
        ...defaultConfig.auth,
        ...userConfig.auth,
      },
      services: {
        storage: {
          ...defaultConfig.services.storage,
          ...userConfig.services?.storage,
        },
        db: {
          ...defaultConfig.services.db,
          ...userConfig.services?.db,
        },
      },
    };
  }

  private async validateRequest(
    path: string,
    request: Request
  ): Promise<boolean> {
    if (!this.config.auth?.enabled) {
      return true;
    }

    // Check excluded paths
    const isExcluded = this.config.auth.exclude?.some((pattern) => {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return path.startsWith(prefix);
      }
      return pattern === path;
    });

    if (isExcluded) {
      return true;
    }

    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return false;
    }

    return await this.auth.validateToken(token);
  }

  use(middleware: Handler) {
    this.middlewares.push(middleware);
    return this;
  }

  private async runMiddlewares(context: Context) {
    for (const middleware of this.middlewares) {
      await middleware(context);
      if (context.res.body !== null) {
        // If a middleware sets a response, stop processing
        return true;
      }
    }
    return false;
  }

  private async createContext(adapter: ServerAdapter): Promise<Context> {
    const headers = adapter.getHeaders();

    const request = {
      params: adapter.getQuery(),
      query: adapter.getQuery(),
      body: await adapter.getBody(),
      headers: headers,
      method: adapter.getMethod(),
      path: adapter.getPath(),
      config: this.config,
      user: adapter.getUserContext(),
    };

    const response = {
      body: null,
      status: 200,
      headers: headers,
    };

    return {
      req: request,
      res: response,
      services: { storage: this.storage, auth: this.auth, db: this.db },
    };
  }

  async handle(adapter: ServerAdapter): Promise<void> {
    const context = await this.createContext(adapter);

    if (await this.runMiddlewares(context)) {
      this.sendResponse(adapter, context);
      return;
    }

    const handler = this.findHandler(adapter.getMethod(), adapter.getPath());
    if (!handler) {
      adapter.setStatus(404);
      adapter.send({ message: "Not found" });
      return;
    }

    try {
      await handler(context);
      this.sendResponse(adapter, context);
    } catch (error) {
      console.error("Handler error:", error);
      adapter.setStatus(500);
      adapter.send({ message: "Internal server error" });
    }
  }

  private sendResponse(adapter: ServerAdapter, context: Context) {
    adapter.setStatus(context.res.status);
    for (const [key, value] of Object.entries(context.res.headers)) {
      adapter.setHeader(key, value);
    }
    adapter.send(context.res.body);
  }

  getConfig(): BaaSConfig {
    return this.config;
  }

  private registerCoreRoutes() {
    // Built-in authentication endpoints
    this.post("/auth/register", async (ctx) => {
      const { email, password } = ctx.req.body;
      const userId = await this.auth.createUser(email, password);
      ctx.res.body = { userId };
    });

    this.post("/auth/login", async (ctx) => {
      // Login implementation
    });

    // Built-in storage endpoints
    this.post("/storage/:bucket/:key", async (ctx) => {
      const { bucket, key } = ctx.req.params;
      await this.storage.upload(bucket, key, ctx.req.body);
      ctx.res.status = 201;
    });

    this.get("/storage/:bucket/:key", async (ctx) => {
      const { bucket, key } = ctx.req.params;
      ctx.res.body = await this.storage.download(bucket, key);
    });

    // Built-in database endpoints
    this.post("/db/:collection", async (ctx) => {
      const { collection } = ctx.req.params;
      const id = await this.db.insert(collection, ctx.req.body, ctx.req.user);
      ctx.res.body = { id };
      ctx.res.status = 201;
    });

    this.get("/db/:collection", async (ctx) => {
      const { collection } = ctx.req.params;
      ctx.res.body = await this.db.query(
        collection,
        ctx.req.query,
        ctx.req.user
      );
    });

    this.get("/db/:collection/:id", async (ctx) => {
      const { collection, id } = ctx.req.params;
      const query: DataQueryParams = { filter: { id: id }, select: ["*"] };
      ctx.res.body = await this.db.query(collection, query, ctx.req.user);
    });
  }

  private addRoute(method: string, path: string, handler: Handler) {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }

    this.routes.get(method)!.set(path, handler);
  }

  // Public API methods that match your preferred interface
  get(path: string, handler: Handler) {
    this.addRoute("GET", path, handler);
    return this;
  }

  post(path: string, handler: Handler) {
    this.addRoute("POST", path, handler);
    return this;
  }

  put(path: string, handler: Handler) {
    this.addRoute("PUT", path, handler);
    return this;
  }

  delete(path: string, handler: Handler) {
    this.addRoute("DELETE", path, handler);
    return this;
  }

  private findHandler(method: string, path: string): Handler | undefined {
    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) return undefined;

    // Find matching route pattern
    for (const [pattern, handler] of methodRoutes.entries()) {
      if (this.matchPath(pattern, path)) {
        return handler;
      }
    }

    return undefined;
  }

  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) return false;

    return patternParts.every((part, i) => {
      if (part.startsWith(":")) return true;
      return part === pathParts[i];
    });
  }
}
