'use client';

import React, { ReactNode, createContext, useContext } from 'react';
import { DatabaseSDK } from '@forgebase-ts/sdk/database/client';
import { useAuth } from '../hooks/useAuth';

// Create a context for the database SDK
const DatabaseContext = createContext<DatabaseSDK | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
  apiUrl: string;
}

export function DatabaseProvider({ children, apiUrl }: DatabaseProviderProps) {
  const { auth } = useAuth();

  // Initialize the database SDK with the auth instance's axios instance
  // This ensures authenticated requests
  console.log('DatabaseProvider', apiUrl);
  const authInterceptor = auth.getAuthInterceptors();
  const databaseSDK = new DatabaseSDK({
    baseUrl: apiUrl,
    axiosConfig: {},
    authInterceptors: authInterceptor,
  });
  databaseSDK.setBaseUrl(apiUrl);

  return (
    <DatabaseContext.Provider value={databaseSDK}>
      {children}
    </DatabaseContext.Provider>
  );
}

// Hook to use the database context
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === null) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
