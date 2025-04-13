import { TablePermissions, UserContext } from '../types';
import { evaluatePermission } from '../rlsManager';
import { PermissionService } from '../permissionService';
import { RealtimeAdapter } from './RealtimeAdapter';
import sseAdapter from 'crossws/adapters/sse';
import { defineHooks } from 'crossws';

interface SubscribeMessage {
  type: 'subscribe';
  tableName: string;
  userContext?: UserContext;
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  tableName: string;
}

interface GenericMessage {
  type: string;
  tableName?: string;
  [key: string]: unknown;
}

type ClientMessage = SubscribeMessage | UnsubscribeMessage | GenericMessage;

export class SSEManager implements RealtimeAdapter {
  private sseAdapter: ReturnType<typeof sseAdapter>;

  constructor(
    private port: number,
    private permissionService: PermissionService
  ) {
    this.initialize();
  }

  /**
   * Initialize the SSE server
   */
  public initialize(): void {
    this.setupSSEServer();
  }

  private setupSSEServer() {
    this.sseAdapter = sseAdapter({
      bidir: true, // Enable bidirectional messaging support
      hooks: {
        upgrade: (request) => {
          // Extract user context from request headers
          let userContext: UserContext | undefined;
          try {
            const userContextHeader = request.headers.get('user-context');
            if (userContextHeader) {
              userContext = JSON.parse(userContextHeader);
            }

            if (!userContext) {
              return new Response('Authentication required', { status: 401 });
            }
          } catch (error) {
            console.error('Error parsing user context:', error);
            return new Response('Invalid user context', { status: 400 });
          }
          request.context.userContext = userContext;
          // In case of bidirectional mode, extra auth is recommended based on request
          // return {
          //   headers: {},
          // };
        },
        open: (peer) => {
          // Send welcome message
          peer.send(
            JSON.stringify({
              type: 'welcome',
              message: `Welcome ${peer.id}`,
            })
          );
        },
        message: async (peer, message) => {
          try {
            const msg =
              typeof message === 'string'
                ? JSON.parse(message)
                : ((await message.json()) as ClientMessage);

            if (msg.type === 'subscribe' && msg.tableName) {
              // Get user context from peer data
              const userContext = peer.context.userContext as
                | UserContext
                | undefined;

              if (!userContext) {
                peer.send(
                  JSON.stringify({
                    type: 'error',
                    message: 'Authentication required',
                  })
                );
                return;
              }

              // Check table permissions
              const permissions =
                await this.permissionService.getPermissionsForTable(
                  msg.tableName
                );

              if (!permissions) {
                peer.send(
                  JSON.stringify({
                    type: 'error',
                    message: 'Table not found',
                  })
                );
                return;
              }

              // Check if user can subscribe
              const canSubscribe = await this.canSubscribe(
                userContext,
                permissions
              );
              if (!canSubscribe) {
                peer.send(
                  JSON.stringify({
                    type: 'error',
                    message: 'Permission denied',
                  })
                );
                return;
              }

              // Subscribe the peer to the table channel
              peer.subscribe(`table:${msg.tableName}`);

              peer.send(
                JSON.stringify({
                  type: 'subscribed',
                  tableName: msg.tableName,
                })
              );
            } else if (msg.type === 'unsubscribe' && msg.tableName) {
              // Unsubscribe from the table channel
              peer.unsubscribe(`table:${msg.tableName}`);

              peer.send(
                JSON.stringify({
                  type: 'unsubscribed',
                  tableName: msg.tableName,
                })
              );
            }
          } catch (error) {
            console.error('Error handling message:', error);
            peer.send(
              JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
              })
            );
          }
        },
        close: (peer) => {
          // No need to manually clean up subscriptions
          // crossws handles this automatically
          console.log(`Client ${peer.id} disconnected`);
        },
      },
    });

    console.log(`SSE adapter initialized for port ${this.port}`);
    console.log(
      'Use getSSEAdapter() and handleRequest() methods to integrate with your HTTP server'
    );
  }

  private async canSubscribe(
    userContext: UserContext,
    permissions: TablePermissions
  ): Promise<boolean> {
    if (!permissions.operations.SELECT) return false;

    // Create a copy of the rules without fieldCheck
    const selectRules = permissions.operations.SELECT;
    const rulesWithoutFieldCheck = selectRules.map((rule) => {
      // Using destructuring to remove fieldCheck from the rule
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fieldCheck, ...ruleWithoutFieldCheck } = rule;
      return ruleWithoutFieldCheck;
    });

    // Check if the user has the required permissions to subscribe
    return evaluatePermission(rulesWithoutFieldCheck, userContext);
  }

  /**
   * Broadcast a message to all clients subscribed to a table
   * @param tableName The name of the table
   * @param event The event type (create, update, delete)
   * @param data The data to broadcast
   */
  public async broadcast(
    tableName: string,
    event: string,
    data: Record<string, unknown> | Record<string, unknown>[]
  ): Promise<void> {
    // Get permissions for the table
    const permissions = await this.permissionService.getPermissionsForTable(
      tableName
    );

    if (!permissions || !permissions.operations.SELECT) return;

    // Prepare the data to broadcast
    const dataArray = Array.isArray(data) ? data : [data];

    // Publish to the table channel
    // Note: In a real implementation, we would filter data based on user permissions
    // But since we're using pub/sub, all subscribers will receive the same message
    // FIXME: Assess the permissions for each row
    const message = JSON.stringify({
      event,
      tableName,
      data: dataArray,
    });

    // Use the SSE adapter to publish to all subscribers of this table
    this.sseAdapter.publish(`table:${tableName}`, message);
  }

  /**
   * Get the port the SSE server is listening on
   * @returns The port number
   */
  public getPort(): number {
    return this.port;
  }

  /**
   * Get the SSE adapter instance
   * This can be used to integrate with an HTTP server
   * @returns The SSE adapter instance
   */
  public getSSEAdapter() {
    return this.sseAdapter;
  }

  /**
   * Handle an incoming HTTP request
   * This method can be used to integrate with any HTTP server framework
   * @param request The HTTP request object (must be compatible with the Fetch API Request)
   * @returns A Response object
   */
  public async handleRequest(request: Request): Promise<Response> {
    // Check if this is an SSE request
    if (
      request.headers.get('accept') === 'text/event-stream' ||
      request.headers.has('x-crossws-id')
    ) {
      return this.sseAdapter.fetch(request);
    }

    // Return 404 for non-SSE requests
    return new Response('Not found', { status: 404 });
  }
}
