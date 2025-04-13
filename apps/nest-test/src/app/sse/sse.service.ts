import { Injectable, OnModuleInit } from '@nestjs/common';
import { ForgeApiService } from '@forgebase-ts/api/core/nest';
import { SSEManager } from '@forgebase-ts/database';

@Injectable()
export class SSEService implements OnModuleInit {
  private sseManager: SSEManager;

  constructor(private readonly forgeApiService: ForgeApiService) {}

  onModuleInit() {
    // Get the ForgeDatabase instance
    const forgeDatabase = this.forgeApiService
      .getDatabaseService()
      .getForgeDatabase();

    // Get the realtime adapter (SSEManager)
    // Note: We need to cast it to SSEManager
    const realtimeAdapter = forgeDatabase.realtimeAdapter;

    if (realtimeAdapter && realtimeAdapter instanceof SSEManager) {
      this.sseManager = realtimeAdapter;
      console.log(
        `SSE adapter initialized on port ${this.sseManager.getPort()}`
      );
    } else {
      console.warn(
        'SSE adapter not found. Make sure to configure ForgeDatabase with realtimeAdapter: "sse"'
      );
    }
  }

  /**
   * Handle an incoming HTTP request for SSE
   * @param request The Fetch API Request object
   * @returns A Response object
   */
  async handleRequest(request: Request): Promise<Response> {
    if (!this.sseManager) {
      return new Response('SSE adapter not initialized', { status: 500 });
    }

    return this.sseManager.handleRequest(request);
  }

  /**
   * Get the SSE adapter instance
   * @returns The SSE adapter instance
   */
  getSSEAdapter() {
    return this.sseManager?.getSSEAdapter();
  }

  /**
   * Broadcast a message to all clients subscribed to a table
   * @param tableName The name of the table
   * @param event The event type (create, update, delete)
   * @param data The data to broadcast
   */
  async broadcast(
    tableName: string,
    event: string,
    data: Record<string, unknown> | Record<string, unknown>[]
  ): Promise<void> {
    if (!this.sseManager) {
      console.warn('SSE adapter not initialized. Cannot broadcast message.');
      return;
    }

    return this.sseManager.broadcast(tableName, event, data);
  }
}
