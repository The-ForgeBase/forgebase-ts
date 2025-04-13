import { TablePermissions, UserContext } from '../types';

/**
 * Interface for realtime adapters that can be used for database table broadcasts
 */
export interface RealtimeAdapter {
  /**
   * Initialize the adapter
   */
  initialize(): void;

  /**
   * Broadcast a message to all clients subscribed to a table
   * @param tableName The name of the table
   * @param event The event type (create, update, delete)
   * @param data The data to broadcast
   */
  broadcast(tableName: string, event: string, data: any): Promise<void>;

  /**
   * Get the port the adapter is listening on
   */
  getPort(): number;
}
