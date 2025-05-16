import { AuthProvider } from '../types.js';
import { DynamicAuthManager } from '../authManager.js';
import { BaseOAuthProvider } from '../providers/oauth/index.js';

export interface AuthPlugin {
  name: string;
  version: string;
  initialize(authManager: DynamicAuthManager): Promise<void>;
  getProvider(): Record<string, AuthProvider | BaseOAuthProvider>;

  // Optional extension points
  getMiddlewares?(): Record<string, any>;
  getHooks?(): Record<string, (data: any) => Promise<void>>;
  cleanup?(): Promise<void>;
}
