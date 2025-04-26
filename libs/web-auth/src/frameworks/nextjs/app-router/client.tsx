'use client';

import React from 'react';
import { ForgebaseWebAuth } from '../../../ForgebaseWebAuth';
import { ForgebaseWebAuthConfig, User } from '../../../types';
import { AuthProvider } from '../../react';

/**
 * Client-side auth provider props for App Router
 */
interface ClientAuthProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
  initialAccessToken?: string;
  initialRefreshToken?: string;
  authConfig: {
    apiUrl: string;
    [key: string]: any;
  };
}

/**
 * Create an auth instance for server components in App Router
 */
export function createAppRouterAuth(
  config: ForgebaseWebAuthConfig
): ForgebaseWebAuth {
  // Create auth instance with SSR flag
  return new ForgebaseWebAuth({
    ...config,
    ssr: true,
  });
}

/**
 * Client-side auth provider for App Router
 * This component should be used in a client component
 */
export function AppRouterAuthProvider({
  children,
  initialUser,
  initialAccessToken,
  initialRefreshToken,
  authConfig,
}: ClientAuthProviderProps) {
  // Create auth instance on the client
  const auth = new ForgebaseWebAuth({
    ...authConfig,
    ssr: false,
  });

  return (
    <AuthProvider
      auth={auth}
      initialUser={initialUser}
      initialAccessToken={initialAccessToken}
      initialRefreshToken={initialRefreshToken}
    >
      {children}
    </AuthProvider>
  );
}
