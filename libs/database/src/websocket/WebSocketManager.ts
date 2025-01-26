import {
  App,
  SHARED_COMPRESSOR,
  TemplatedApp,
  WebSocket,
} from 'uWebSockets.js';
import { TablePermissions, UserContext } from '../types';
import { evaluatePermission } from '../rlsManager';
import { PermissionService } from '../permissionService';

interface SocketClient extends WebSocket<any> {
  id: string;
  subscribedTables: Set<string>;
  userContext?: UserContext;
}

export class WebSocketManager {
  private app: TemplatedApp;
  private clients: Map<string, SocketClient> = new Map();
  private tableSubscriptions: Map<string, Set<string>> = new Map();

  constructor(
    private port: number,
    private permissionService: PermissionService
  ) {
    this.app = App();
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.app.ws('/*', {
      compression: SHARED_COMPRESSOR,
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 10,
      upgrade: (res, req, context) => {
        res.upgrade(
          {
            userContext: JSON.parse(req.getHeader('user-context')),
          },
          /* Spell these correctly */
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'),
          context
        );
      },
      open: (ws: any) => {
        const socketClient = ws as SocketClient;
        socketClient.id = Math.random().toString(36).substr(2, 9);
        socketClient.subscribedTables = new Set();
        socketClient.userContext = ws.userContext;
        this.clients.set(socketClient.id, socketClient);
      },
      message: async (ws, message) => {
        const socketClient = ws as SocketClient;
        const msg = JSON.parse(Buffer.from(message).toString());

        switch (msg.type) {
          case 'subscribe':
            await this.handleSubscribe(socketClient, msg.tableName);
            break;

          case 'unsubscribe':
            this.handleUnsubscribe(socketClient, msg.tableName);
            break;

          default:
            this.sendError(socketClient, 'Invalid message type');
            break;
        }
      },
      close: (ws) => {
        const socketClient = ws as SocketClient;
        this.removeClient(socketClient);
      },
      drain: (ws) => {
        const socketClient = ws as SocketClient;
        this.removeClient(socketClient);
      },
    });

    this.app.listen(this.port, () => {
      console.log(`WebSocket server listening on port ${this.port}`);
    });
  }

  private async handleSubscribe(client: SocketClient, tableName: string) {
    if (!client.userContext) {
      this.sendError(client, 'Authentication required');
      return;
    }

    // Check table permissions
    const permissions = await this.permissionService.getPermissionsForTable(
      tableName
    );
    if (!this.canSubscribe(client.userContext, permissions)) {
      this.sendError(client, 'Permission denied');
      return;
    }

    client.subscribedTables.add(tableName);

    if (!this.tableSubscriptions.has(tableName)) {
      this.tableSubscriptions.set(tableName, new Set());
    }
    this.tableSubscriptions.get(tableName)!.add(client.id);
  }

  private handleUnsubscribe(client: SocketClient, tableName: string) {
    client.subscribedTables.delete(tableName);
    this.tableSubscriptions.get(tableName)?.delete(client.id);
  }

  private removeClient(client: SocketClient) {
    client.subscribedTables.forEach((tableName) => {
      this.tableSubscriptions.get(tableName)?.delete(client.id);
    });
    this.clients.delete(client.id);
  }

  private canSubscribe(
    userContext: UserContext,
    permissions?: TablePermissions
  ): boolean {
    if (!permissions) return false;

    const selectRules = permissions.operations.SELECT;

    if (!selectRules) return false;

    // Check if the user has the required permissions to subscribe
    return evaluatePermission(selectRules, userContext);
  }

  private async processBatch(
    clients: SocketClient[],
    tableName: string,
    event: string,
    data: any[],
    permissions: TablePermissions
  ) {
    const BATCH_SIZE = 100; // Adjust based on your needs

    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      const batchClients = clients.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batchClients.map(async (client) => {
          if (!client.userContext || !permissions.operations.SELECT) return;

          // Filter data based on user permissions
          const filteredData = data.filter((item) =>
            evaluatePermission(
              permissions.operations.SELECT!,
              client.userContext!,
              item
            )
          );

          if (filteredData.length > 0) {
            client.send(
              JSON.stringify({
                event,
                tableName,
                data: filteredData,
              })
            );
          }
        })
      );
    }
  }

  public async broadcast(tableName: string, event: string, data: any) {
    const subscribers = this.tableSubscriptions.get(tableName);
    if (!subscribers) return;

    const permissions = await this.permissionService.getPermissionsForTable(
      tableName
    );
    if (!permissions || !permissions.operations.SELECT) return;

    // Get all active clients for this table
    const activeClients = Array.from(subscribers)
      .map((clientId) => this.clients.get(clientId))
      .filter((client): client is SocketClient => client !== undefined);

    // Handle single record vs array of records
    const dataArray = Array.isArray(data) ? data : [data];

    // Process in batches
    await this.processBatch(
      activeClients,
      tableName,
      event,
      dataArray,
      permissions
    );
  }

  private sendError(client: SocketClient, message: string) {
    client.send(JSON.stringify({ type: 'error', message }));
  }
}
