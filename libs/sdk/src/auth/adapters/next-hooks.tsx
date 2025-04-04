import React, { createContext, useContext, useEffect, useState } from 'react';
import type { BaseUser, LoginCredentials, RegisterCredentials } from '../types';
import { NextAuthAdapter } from './next';

const AuthContext = createContext<{
  user: BaseUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: <R extends Record<string, unknown>>(
    credentials: RegisterCredentials<R>
  ) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (userId: string, code: string) => Promise<void>;
} | null>(null);

interface AuthProviderProps<T extends BaseUser = BaseUser> {
  children: React.ReactNode;
  authAdapter: NextAuthAdapter<T>;
}

export function AuthProvider<T extends BaseUser = BaseUser>({
  children,
  authAdapter,
}: AuthProviderProps<T>) {
  const [user, setUser] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authAdapter.getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [authAdapter]);

  const login = async (credentials: LoginCredentials) => {
    const result = await authAdapter.login(credentials);
    if (result.user) {
      setUser(result.user as T);
    }
  };

  const register = async <R extends Record<string, unknown>>(
    credentials: RegisterCredentials<R>
  ) => {
    const result = await authAdapter.register(credentials);
    if (result.user) {
      setUser(result.user as T);
    }
  };

  const logout = async () => {
    await authAdapter.logout();
    setUser(null);
  };

  const verifyEmail = async (userId: string, code: string) => {
    const result = await authAdapter.verifyEmail(userId, code);
    if (result.user) {
      setUser(result.user as T);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Server actions for Next.js App Router
export function createAuthActions<T extends BaseUser = BaseUser>(
  authAdapter: NextAuthAdapter<T>
) {
  return {
    getCurrentUser: authAdapter.getCurrentUser.bind(authAdapter),
    isAuthenticated: authAdapter.isAuthenticated.bind(authAdapter),
    verifyEmail: authAdapter.verifyEmail.bind(authAdapter),
    getToken: authAdapter.getToken.bind(authAdapter),
  };
}
