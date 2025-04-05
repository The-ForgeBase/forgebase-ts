'use client';

import React, { ReactNode } from 'react';
import { ForgebaseWebAuth, StorageType, User } from '@forgebase-ts/web-auth';
import { AuthProvider as ForgebaseAuthProvider } from '@forgebase-ts/web-auth/frameworks/react';

const auth = new ForgebaseWebAuth({
  apiUrl: 'http://localhost:8000/api',
  storageType: StorageType.COOKIE,
  useCookies: true,
  withCredentials: true,
  secureCookies: false, // Set to true in production
  ssr: true,
});

interface ClientAuthProviderProps {
  children: ReactNode;
  initialUser: User | null;
  initialAccessToken?: string;
  initialRefreshToken?: string;
}

export default function ClientAuthProvider({
  children,
  initialUser,
  initialAccessToken,
  initialRefreshToken,
}: ClientAuthProviderProps) {
  return (
    <ForgebaseAuthProvider
      auth={auth}
      initialUser={initialUser}
      initialAccessToken={initialAccessToken}
      initialRefreshToken={initialRefreshToken}
    >
      {children}
    </ForgebaseAuthProvider>
  );
}
