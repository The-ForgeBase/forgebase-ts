import { Knex } from 'knex';
import * as crypto from 'crypto';
import { AuthAdminApiKeysTable } from '../config';
import { AdminApiKey, AdminApiKeyCreateOptions } from '../types/admin';

/**
 * Service for managing admin API keys
 */
export class AdminApiKeyService {
  constructor(private knex: Knex) {}

  /**
   * Generate a new API key
   * @returns Object containing the full API key and its prefix
   */
  private generateApiKey(): { key: string; prefix: string } {
    // Generate a random 32-byte key
    const key = crypto.randomBytes(32).toString('hex');
    // Use the first 8 characters as the prefix (visible part)
    const prefix = key.substring(0, 8);
    return { key, prefix };
  }

  /**
   * Hash an API key for storage
   * @param key The API key to hash
   * @returns The hashed key
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Create a new API key for an admin
   * @param options API key creation options
   * @returns The created API key and the full key (only returned once)
   */
  async createApiKey(
    options: AdminApiKeyCreateOptions
  ): Promise<{ apiKey: AdminApiKey; fullKey: string }> {
    const { key, prefix } = this.generateApiKey();
    const keyHash = this.hashApiKey(key);

    // Convert scopes array to JSON if provided
    const scopes = options.scopes ? JSON.stringify(options.scopes) : null;

    const [apiKey] = await this.knex(AuthAdminApiKeysTable)
      .insert({
        admin_id: options.admin_id,
        key_prefix: prefix,
        key_hash: keyHash,
        name: options.name,
        scopes,
        expires_at: options.expires_at,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Parse scopes back to array if they exist
    if (apiKey.scopes && typeof apiKey.scopes === 'string') {
      apiKey.scopes = JSON.parse(apiKey.scopes);
    }

    return {
      apiKey,
      fullKey: `${prefix}.${key.substring(8)}`, // Format: prefix.rest_of_key
    };
  }

  /**
   * Validate an API key
   * @param apiKey The API key to validate
   * @returns The admin API key if valid, null otherwise
   */
  async validateApiKey(apiKey: string): Promise<AdminApiKey | null> {
    // Split the key into prefix and the rest
    const parts = apiKey.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const prefix = parts[0];
    const key = prefix + parts[1];
    const keyHash = this.hashApiKey(key);

    // Find the API key in the database
    const result = await this.knex(AuthAdminApiKeysTable)
      .where({
        key_prefix: prefix,
        key_hash: keyHash,
      })
      .first();

    if (!result) {
      return null;
    }

    // Check if the key has expired
    if (result.expires_at && new Date(result.expires_at) < new Date()) {
      return null;
    }

    // Update last_used_at
    await this.knex(AuthAdminApiKeysTable)
      .where('id', result.id)
      .update({
        last_used_at: new Date(),
        updated_at: new Date(),
      });

    // Parse scopes if they exist
    if (result.scopes && typeof result.scopes === 'string') {
      result.scopes = JSON.parse(result.scopes);
    }

    return result;
  }

  /**
   * List all API keys for an admin
   * @param adminId The admin ID
   * @returns Array of API keys
   */
  async listApiKeys(adminId: string): Promise<AdminApiKey[]> {
    const apiKeys = await this.knex(AuthAdminApiKeysTable)
      .where('admin_id', adminId)
      .orderBy('created_at', 'desc');

    // Parse scopes for each API key
    return apiKeys.map((key) => {
      if (key.scopes && typeof key.scopes === 'string') {
        key.scopes = JSON.parse(key.scopes);
      }
      return key;
    });
  }

  /**
   * Get an API key by ID
   * @param id The API key ID
   * @returns The API key if found, null otherwise
   */
  async getApiKeyById(id: string): Promise<AdminApiKey | null> {
    const apiKey = await this.knex(AuthAdminApiKeysTable).where('id', id).first();

    if (!apiKey) {
      return null;
    }

    // Parse scopes if they exist
    if (apiKey.scopes && typeof apiKey.scopes === 'string') {
      apiKey.scopes = JSON.parse(apiKey.scopes);
    }

    return apiKey;
  }

  /**
   * Update an API key
   * @param id The API key ID
   * @param updates The updates to apply
   * @returns The updated API key
   */
  async updateApiKey(
    id: string,
    updates: {
      name?: string;
      scopes?: string[];
      expires_at?: Date | null;
    }
  ): Promise<AdminApiKey | null> {
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.scopes !== undefined) {
      updateData.scopes = JSON.stringify(updates.scopes);
    }

    if (updates.expires_at !== undefined) {
      updateData.expires_at = updates.expires_at;
    }

    const [apiKey] = await this.knex(AuthAdminApiKeysTable)
      .where('id', id)
      .update(updateData)
      .returning('*');

    if (!apiKey) {
      return null;
    }

    // Parse scopes if they exist
    if (apiKey.scopes && typeof apiKey.scopes === 'string') {
      apiKey.scopes = JSON.parse(apiKey.scopes);
    }

    return apiKey;
  }

  /**
   * Delete an API key
   * @param id The API key ID
   * @returns True if the key was deleted, false otherwise
   */
  async deleteApiKey(id: string): Promise<boolean> {
    const deleted = await this.knex(AuthAdminApiKeysTable).where('id', id).delete();
    return deleted > 0;
  }

  /**
   * Delete all API keys for an admin
   * @param adminId The admin ID
   * @returns The number of keys deleted
   */
  async deleteAllApiKeys(adminId: string): Promise<number> {
    return await this.knex(AuthAdminApiKeysTable).where('admin_id', adminId).delete();
  }

  /**
   * Check if an API key has a specific scope
   * @param apiKey The API key
   * @param scope The scope to check
   * @returns True if the API key has the scope, false otherwise
   */
  hasScope(apiKey: AdminApiKey, scope: string): boolean {
    // If no scopes are defined, the key has no permissions
    if (!apiKey.scopes || !Array.isArray(apiKey.scopes)) {
      return false;
    }

    // Check if the key has the wildcard scope
    if (apiKey.scopes.includes('*')) {
      return true;
    }

    // Check if the key has the specific scope
    return apiKey.scopes.includes(scope);
  }
}
