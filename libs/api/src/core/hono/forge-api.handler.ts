import { Hono } from 'hono';
import { ForgeApiService } from './forge-api.service';
import {
  DataMutationParams,
  DataQueryParams,
  AuthenticationRequiredError,
  PermissionDeniedError,
  UserContext,
} from '@forgebase-ts/database';
import { HTTPException } from 'hono/http-exception';
import { SessionData } from '@forgebase-ts/auth/adapters/web';

// Define the environment variables for our Hono app
export type FgAPiVariables = {
  userContext: UserContext | null;
  isAdmin: boolean;
  isSystem: boolean;
  session: SessionData | null;
};

export class ForgeApiHandler {
  private app: Hono<{ Variables: FgAPiVariables }>;
  private enableSchemaEndpoints = true;
  private enableDataEndpoints = true;
  private enablePermissionEndpoints = true;

  constructor(
    private readonly forgeApiService: ForgeApiService,
    config: {
      enableSchemaEndpoints?: boolean;
      enableDataEndpoints?: boolean;
      enablePermissionEndpoints?: boolean;
    }
  ) {
    this.enableSchemaEndpoints = config?.enableSchemaEndpoints || true;
    this.enableDataEndpoints = config?.enableDataEndpoints || true;
    this.enablePermissionEndpoints = config?.enablePermissionEndpoints || true;
    this.app = new Hono<{ Variables: FgAPiVariables }>();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Schema endpoints
    if (this.enableSchemaEndpoints) {
      this.app.get('/db/schema', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const schema = await this.forgeApiService
            .getDatabaseService()
            .getSchema();
          return c.json(schema);
        } catch (error) {
          console.error('Error getting schema:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.get('/db/schema/tables', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const tables = await this.forgeApiService
            .getDatabaseService()
            .getTables();
          return c.json(tables);
        } catch (error) {
          console.error('Error getting tables:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.get('/db/schema/tables/permission/:tableName', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const tableName = c.req.param('tableName');
          const tablePermission = await this.forgeApiService
            .getDatabaseService()
            .getTableSchemaWithPermissions(tableName);
          return c.json(tablePermission);
        } catch (error) {
          console.error('Error getting table permission:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.get('/db/schema/tables/:tableName', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const tableName = c.req.param('tableName');
          const tableSchema = await this.forgeApiService
            .getDatabaseService()
            .getTableSchema(tableName);
          return c.json(tableSchema);
        } catch (error) {
          console.error('Error getting table schema:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.delete('/db/schema/tables/:tableName', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const tableName = c.req.param('tableName');
          const result = await this.forgeApiService
            .getDatabaseService()
            .deleteSchema(tableName);
          return c.json(result);
        } catch (error) {
          console.error('Error deleting table:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.post('/db/schema', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const body = await c.req.json();
          const { tableName, columns } = body;
          const result = await this.forgeApiService
            .getDatabaseService()
            .createSchema(tableName, columns);
          return c.json(result);
        } catch (error) {
          console.error('Error creating schema:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.post('/db/schema/column', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const body = await c.req.json();
          const { tableName, columns } = body;
          const result = await this.forgeApiService
            .getDatabaseService()
            .addColumn(tableName, columns);
          return c.json(result);
        } catch (error) {
          console.error('Error adding column:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.delete('/db/schema/column', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const body = await c.req.json();
          const { tableName, columns } = body;
          const result = await this.forgeApiService
            .getDatabaseService()
            .deleteColumn(tableName, columns);
          return c.json(result);
        } catch (error) {
          console.error('Error deleting column:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.put('/db/schema/column', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const body = await c.req.json();
          const { tableName, columns } = body;
          const result = await this.forgeApiService
            .getDatabaseService()
            .updateColumn(tableName, columns);
          return c.json(result);
        } catch (error) {
          console.error('Error updating column:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.post('/db/schema/foreign_key', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const body = await c.req.json();
          const { tableName, foreignKey } = body;
          const result = await this.forgeApiService
            .getDatabaseService()
            .addForeignKey(tableName, foreignKey);
          return c.json(result);
        } catch (error) {
          console.error('Error adding foreign key:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.delete('/db/schema/foreign_key', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const body = await c.req.json();
          const { tableName, column } = body;
          const result = await this.forgeApiService
            .getDatabaseService()
            .dropForeignKey(tableName, column);
          return c.json(result);
        } catch (error) {
          console.error('Error dropping foreign key:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.delete('/db/schema/truncate', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const body = await c.req.json();
          const { tableName } = body;
          const result = await this.forgeApiService
            .getDatabaseService()
            .truncateTable(tableName);
          return c.json(result);
        } catch (error) {
          console.error('Error truncating table:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });
    }

    // Permission endpoints
    if (this.enablePermissionEndpoints) {
      this.app.get('/db/schema/permissions/:tableName', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const tableName = c.req.param('tableName');
          const permissions = await this.forgeApiService
            .getDatabaseService()
            .getPermissions(tableName);
          return c.json(permissions);
        } catch (error) {
          console.error('Error getting permissions:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });

      this.app.post('/db/schema/permissions/:tableName', async (c) => {
        try {
          const isAdmin = c.get('isAdmin') || false;
          if (!isAdmin) {
            throw new HTTPException(403, { message: 'Admin access required' });
          }

          const tableName = c.req.param('tableName');
          const body = await c.req.json();
          let permissions = body;

          // Check if permissions is a string, then convert to object
          if (typeof permissions === 'string') {
            permissions = JSON.parse(permissions);
          }

          if (!permissions || typeof permissions !== 'object') {
            throw new HTTPException(400, {
              message: 'Invalid permissions provided',
            });
          }

          const result = await this.forgeApiService
            .getDatabaseService()
            .setPermissions(tableName, permissions);
          return c.json(result);
        } catch (error) {
          console.error('Error setting permissions:', error);
          if (error instanceof HTTPException) {
            throw error;
          }
          throw new HTTPException(400, {
            message: error.message || 'Internal server error',
          });
        }
      });
    }

    // Database endpoints
    if (this.enableDataEndpoints) {
      this.app.post('/db/:collection', async (c) => {
        try {
          const collection = c.req.param('collection');
          const body = await c.req.json();
          let { data } = body;

          // Check if data is a string, then convert to object
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }

          if (!data || typeof data !== 'object') {
            throw new HTTPException(400, { message: 'Invalid data provided' });
          }

          const userContext = c.get('userContext');
          const isSystem = c.get('isSystem') || false;

          const id = await this.forgeApiService.getDatabaseService().insert(
            collection,
            {
              tableName: collection,
              data,
            },
            userContext,
            isSystem
          );

          return c.json({ id });
        } catch (error) {
          console.error('Error creating item:', error);
          if (error instanceof AuthenticationRequiredError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof PermissionDeniedError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof HTTPException) {
            throw error;
          } else {
            throw new HTTPException(400, {
              message: error.message || 'Internal server error',
            });
          }
        }
      });

      this.app.get('/db/:collection', async (c) => {
        try {
          const collection = c.req.param('collection');
          const query = c.req.query();
          const userContext = c.get('userContext');
          const isSystem = c.get('isSystem') || false;

          const result = await this.forgeApiService
            .getDatabaseService()
            .query(collection, query, userContext, isSystem);
          return c.json(result);
        } catch (error) {
          console.error('Error querying items:', error);
          if (error instanceof AuthenticationRequiredError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof PermissionDeniedError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof HTTPException) {
            throw error;
          } else {
            throw new HTTPException(400, {
              message: error.message || 'Internal server error',
            });
          }
        }
      });

      this.app.get('/db/:collection/:id', async (c) => {
        try {
          const collection = c.req.param('collection');
          const id = c.req.param('id');
          const userContext = c.get('userContext');
          const isSystem = c.get('isSystem') || false;

          const query: DataQueryParams = { filter: { id }, select: ['*'] };
          const result = await this.forgeApiService
            .getDatabaseService()
            .query(collection, query, userContext, isSystem);
          return c.json(result);
        } catch (error) {
          console.error('Error getting item by id:', error);
          if (error instanceof AuthenticationRequiredError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof PermissionDeniedError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof HTTPException) {
            throw error;
          } else {
            throw new HTTPException(400, {
              message: error.message || 'Internal server error',
            });
          }
        }
      });

      this.app.put('/db/:collection/:id', async (c) => {
        try {
          const collection = c.req.param('collection');
          const id = c.req.param('id');
          const body = await c.req.json();
          let { data } = body;
          const userContext = c.get('userContext');
          const isSystem = c.get('isSystem') || false;

          // Check if data is a string, then convert to object
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }

          const params: DataMutationParams = {
            tableName: collection,
            data: data,
            id,
          };

          await this.forgeApiService
            .getDatabaseService()
            .update(params, userContext, isSystem);
          return c.json({ success: true });
        } catch (error) {
          console.error('Error updating item:', error);
          if (error instanceof AuthenticationRequiredError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof PermissionDeniedError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof HTTPException) {
            throw error;
          } else {
            throw new HTTPException(400, {
              message: error.message || 'Internal server error',
            });
          }
        }
      });

      this.app.delete('/db/:collection/:id', async (c) => {
        try {
          const collection = c.req.param('collection');
          const id = c.req.param('id');
          const userContext = c.get('userContext');
          const isSystem = c.get('isSystem') || false;

          await this.forgeApiService
            .getDatabaseService()
            .delete(collection, id, userContext, isSystem);
          return c.json({ success: true });
        } catch (error) {
          console.error('Error deleting item:', error);
          if (error instanceof AuthenticationRequiredError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof PermissionDeniedError) {
            throw new HTTPException(403, { message: error.message });
          } else if (error instanceof HTTPException) {
            throw error;
          } else {
            throw new HTTPException(400, {
              message: error.message || 'Internal server error',
            });
          }
        }
      });
    }
  }

  getApp(): Hono<{ Variables: FgAPiVariables }> {
    return this.app;
  }
}
