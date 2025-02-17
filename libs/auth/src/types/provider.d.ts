// import { BaseProvider, AuthProvider } from '../providers/factory';

// export type ProviderConstructor<T extends BaseProvider = BaseProvider> =
//   new () => T;
// export type ProviderBuilder = () => Promise<ProviderConstructor>;

// declare module '@forgebase-ts/auth' {
//   export function registerProvider<T extends BaseProvider>(
//     type: string,
//     builder: () => Promise<ProviderConstructor<T>>
//   ): void;

//   export function createProvider<T extends BaseProvider>(
//     type: string,
//     config: Record<string, any>
//   ): Promise<T>;

//   // Re-export base types
//   export { AuthProvider, BaseProvider };
//   export { OAuthProvider } from '../providers/oauth';

//   // Configuration types
//   export { AuthConfig } from '../config/configuration';

//   // Event types
//   export { AuthEventMap, AuthEventName } from '../lib/events';
// }
