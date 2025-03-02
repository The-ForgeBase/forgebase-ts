import { AuthProvider, User } from '../types';
import { DynamicAuthManager } from '../authManager';

export interface AuthPlugin<TUser extends User = User> {
  name: string;
  version: string;
  initialize(authManager: DynamicAuthManager<TUser>): Promise<void>;
  getProviders(): Record<string, AuthProvider<TUser>>;

  // Optional extension points
  getMiddlewares?(): Record<string, any>;
  getHooks?(): Record<string, (data: any) => Promise<void>>;
  cleanup?(): Promise<void>;
}
