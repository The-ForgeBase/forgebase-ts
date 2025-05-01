import { AuthProvider, User } from '../types';
import { DynamicAuthManager } from '../authManager';
import { BaseOAuthProvider } from '../providers/oauth';

export interface AuthPlugin {
  name: string;
  version: string;
  initialize(authManager: DynamicAuthManager): Promise<void>;
  getProviders(): Record<string, AuthProvider | BaseOAuthProvider>;

  // Optional extension points
  getMiddlewares?(): Record<string, any>;
  getHooks?(): Record<string, (data: any) => Promise<void>>;
  cleanup?(): Promise<void>;
}
