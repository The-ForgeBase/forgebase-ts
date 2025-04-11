'use client';

import React, { ReactNode } from 'react';
import { User } from '@forgebase-ts/web-auth';
import { AuthProvider as ForgebaseAuthProvider } from '@forgebase-ts/web-auth/frameworks/react';
import { auth } from '../lib/auth';

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
