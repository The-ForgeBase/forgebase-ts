import {
  Express,
  Request,
  Response,
  NextFunction,
  Router,
} from 'ultimate-express';
import { DatabaseService } from '../database';
import {
  AdvanceDataMutationParams,
  AuthenticationRequiredError,
  DataMutationParams,
  DataQueryParams,
  ExcludedTableError,
  PermissionDeniedError,
  UserContext,
} from '@the-forgebase/database';
import { BaaSConfig } from '../../types';

export type UltExpressWebRequest = Request & {
  userContext?: UserContext;
  isAdmin?: boolean;
  isSystem?: boolean;
} & Record<string, unknown>;

export class UltExpressWebHandler {
  private router: Router;
  private enableSchemaEndpoints = true;
  private enableDataEndpoints = true;
  private enablePermissionEndpoints = true;
  private config: BaaSConfig;
  private db: DatabaseService;

  constructor(
    config: {
      enableSchemaEndpoints?: boolean;
      enableDataEndpoints?: boolean;
      enablePermissionEndpoints?: boolean;
      authMiddleware?: (
        req: UltExpressWebRequest,
        res: Response,
        next: NextFunction,
      ) => void;
      beforeMiddlewares?: ((
        req: UltExpressWebRequest,
        res: Response,
        next: NextFunction,
      ) => void)[];
      finallyMiddlewares?: ((
        req: UltExpressWebRequest,
        res: Response,
        next: NextFunction,
      ) => void)[];
    },
    fgConfig: Partial<BaaSConfig> = {},
  ) {
    this.router = Router({ mergeParams: true });

    // Set up default configuration
    this.config = {
      prefix: '/api',
      auth: {
        enabled: false,
        exclude: ['/auth/login', '/auth/register'],
      },
      services: {
        storage: {
          provider: 'local',
          config: {},
        },
        db: {
          provider: 'sqlite',
          config: {
            enforceRls: true,
          },
        },
      },
      ...fgConfig,
    };

    // Apply configuration options
    this.enableSchemaEndpoints = config.enableSchemaEndpoints ?? true;
    this.enableDataEndpoints = config.enableDataEndpoints ?? true;
    this.enablePermissionEndpoints = config.enablePermissionEndpoints ?? true;

    // Merge user config with default config
    this.config = this.mergeConfigs(this.config, fgConfig);

    // Initialize database service
    this.db = new DatabaseService(this.config.services?.db);

    // Set up auth middleware
    const authMiddleware =
      config.authMiddleware || ((req, res, next) => next());

    // Apply before middlewares
    const beforeMiddlewares = config.beforeMiddlewares || [];
    beforeMiddlewares.forEach((middleware) => {
      this.router.use(middleware);
    });

    // Apply auth middleware
    this.router.use(authMiddleware);

    // Apply schema guard middleware
    this.router.use(this.schemaGuard.bind(this));

    // Set up routes
    this.setupRoutes();

    // Apply finally middlewares
    const finallyMiddlewares = config.finallyMiddlewares || [];
    finallyMiddlewares.forEach((middleware) => {
      this.router.use(middleware);
    });

    // Set up error handling middleware
    this.router.use(this.errorHandler.bind(this));
  }

  private mergeConfigs(
    defaultConfig: BaaSConfig,
    userConfig: Partial<BaaSConfig>,
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

  private errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (err instanceof ExcludedTableError) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'table does not exist',
      });
      return;
    }

    if (
      err instanceof AuthenticationRequiredError ||
      err instanceof PermissionDeniedError
    ) {
      res.status(403).json({
        error: 'Forbidden',
        message: err.message,
      });
      return;
    }

    res.status(400).json({
      error: 'Bad Request',
      message: err.message || 'Unknown error',
    });
  }

  private schemaGuard(
    req: UltExpressWebRequest,
    res: Response,
    next: NextFunction,
  ): void {
    const route = req.path;
    if (
      (route.startsWith(`/db/schema`) || route.startsWith(`/permissions`)) &&
      !req.isSystem
    ) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  }

  private setupRoutes(): void {
    if (this.enableDataEndpoints) {
      this.dataRoute();
    }

    if (this.enableSchemaEndpoints) {
      this.schemaRoute();
    }

    if (this.enablePermissionEndpoints) {
      this.permissionRoute();
    }
  }

  private dataRoute(): void {
    // Create record
    this.router.post(
      '/db/create/:tableName',
      async (req: UltExpressWebRequest, res: Response): Promise<any> => {
        try {
          const { tableName } = req.params;
          const { data } = req.body;

          if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Invalid data format' });
          }

          const result = await this.db.insert(
            tableName,
            {
              tableName: tableName,
              data,
            },
            req.userContext,
            req.isSystem,
          );

          res.status(201).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Query records
    this.router.post(
      '/db/query/:tableName',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName } = req.params;
          const { query } = req.body;

          const result = await this.db.query(
            tableName,
            query as DataQueryParams,
            req.userContext,
            req.isSystem,
          );

          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Query record by ID
    this.router.post(
      '/db/query/:tableName/:id',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          // eslint-disable-next-line prefer-const
          let { tableName, id } = req.params as {
            tableName: string;
            id: number | string;
          };

          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }

          const query: DataQueryParams = { filter: { id: id }, select: ['*'] };
          const result = await this.db.query(
            tableName,
            query,
            req.userContext,
            req.isSystem,
          );

          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Update record by ID
    this.router.post(
      '/db/update/:tableName/:id',
      async (req: UltExpressWebRequest, res: Response): Promise<any> => {
        try {
          // eslint-disable-next-line prefer-const
          let { tableName, id } = req.params as {
            tableName: string;
            id: number | string;
          };

          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }

          const { data } = req.body;

          if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Invalid data format' });
          }

          const param: DataMutationParams = {
            tableName: tableName,
            data: data,
            id: id,
          };

          const result = this.db.update(param, req.userContext, req.isSystem);
          res.status(204).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Update records by query
    this.router.post(
      '/db/update/:tableName',
      async (req: UltExpressWebRequest, res: Response): Promise<any> => {
        try {
          const { tableName } = req.params;
          const { data, query } = req.body;

          if (
            !data ||
            typeof data !== 'object' ||
            !query ||
            typeof query !== 'object'
          ) {
            return res.status(400).json({ error: 'Invalid data format' });
          }

          const param: AdvanceDataMutationParams = {
            tableName: tableName,
            data: data,
            query,
          };

          const result = this.db.advanceUpdate(
            param,
            req.userContext,
            req.isSystem,
          );
          res.status(204).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Delete record by ID
    this.router.post(
      '/db/del/:tableName/:id',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          // eslint-disable-next-line prefer-const
          let { tableName, id } = req.params as {
            tableName: string;
            id: number | string;
          };

          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }

          const data = await this.db.delete(
            tableName,
            id,
            req.userContext,
            req.isSystem,
          );

          res.status(204).json(data);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Delete records by query
    this.router.post(
      '/db/del/:tableName',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName } = req.params;
          const { query } = req.body;

          const data = await this.db.advanceDelete(
            {
              tableName,
              query,
            },
            req.userContext,
            req.isSystem,
          );

          res.status(204).json(data);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );
  }

  private schemaRoute(): void {
    // Get all schema
    this.router.get(
      '/db/schema',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const result = await this.db.getSchema();
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Get table schema
    this.router.get(
      '/db/schema/tables/:tableName',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName } = req.params;
          const result = await this.db.getTableSchema(tableName);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Delete table schema
    this.router.delete(
      '/db/schema/tables/:tableName',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName } = req.params;
          const result = await this.db.deleteSchema(tableName);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Get all tables
    this.router.get(
      '/db/schema/tables',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const result = await this.db.getTables();
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Create schema
    this.router.post(
      '/db/schema',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName, columns } = req.body;
          const result = await this.db.createSchema(tableName, columns);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Add column
    this.router.post(
      '/db/schema/column',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName, columns } = req.body;
          const result = await this.db.addColumn(tableName, columns);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Delete column
    this.router.delete(
      '/db/schema/column',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName, columns } = req.body;
          const result = await this.db.deleteColumn(tableName, columns);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Update column
    this.router.put(
      '/db/schema/column',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName, columns } = req.body;
          const result = await this.db.updateColumn(tableName, columns);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Add foreign key
    this.router.post(
      '/db/schema/foreign_key',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName, foreignKey } = req.body;
          const result = await this.db.addForeignKey(tableName, foreignKey);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Drop foreign key
    this.router.delete(
      '/db/schema/foreign_key',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName, column } = req.body;
          const result = await this.db.dropForeignKey(tableName, column);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Truncate table
    this.router.delete(
      '/db/schema/truncate',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName } = req.body;
          const result = await this.db.truncateTable(tableName);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );
  }

  private permissionRoute(): void {
    // Get permissions
    this.router.get(
      '/permissions/:tableName',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName } = req.params;
          const result = await this.db.getPermissions(tableName);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );

    // Set permissions
    this.router.post(
      '/permissions/:tableName',
      async (req: UltExpressWebRequest, res: Response) => {
        try {
          const { tableName } = req.params;
          const { permissions } = req.body;
          const result = await this.db.setPermissions(tableName, permissions);
          res.status(200).json(result);
        } catch (e) {
          this.handleError(e, res);
        }
      },
    );
  }

  private handleError(e: any, res: Response): void {
    if (e instanceof ExcludedTableError) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'table does not exist',
      });
      return;
    }

    if (
      e instanceof AuthenticationRequiredError ||
      e instanceof PermissionDeniedError
    ) {
      res.status(403).json({
        error: 'Forbidden',
        message: e.message,
      });
      return;
    }

    res.status(400).json({
      error: 'Bad Request',
      message: e.message || 'Unknown error',
    });
  }

  getDatabaseService(): DatabaseService {
    return this.db;
  }

  getRouter(): Router {
    return this.router;
  }

  handleRequest(app: Express): Express {
    return app.use(this.config.prefix, this.router);
  }

  setSession(
    req: UltExpressWebRequest,
    session: {
      userContext: UserContext;
      isSystem?: boolean;
    },
  ): UltExpressWebRequest {
    req.userContext = session.userContext;
    req.isSystem = session.isSystem;
    return req;
  }
}

export function createUltExpressHandler(options: {
  config: {
    enableSchemaEndpoints?: boolean;
    enableDataEndpoints?: boolean;
    enablePermissionEndpoints?: boolean;
    authMiddleware?: (
      req: UltExpressWebRequest,
      res: Response,
      next: NextFunction,
    ) => void;
  };
  fgConfig: Partial<BaaSConfig>;
}): UltExpressWebHandler {
  return new UltExpressWebHandler(options.config, options.fgConfig);
}
