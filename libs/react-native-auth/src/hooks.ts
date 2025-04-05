import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { ForgebaseAuth } from './ForgebaseAuth';
import {
  User,
  AuthError,
  LoginCredentials,
  RegisterCredentials,
} from './types';

/**
 * Auth context interface
 */
interface AuthContextType {
  auth: ForgebaseAuth;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: (
    email: string,
    redirectUrl?: string
  ) => Promise<{ success: boolean; token?: string }>;
  verifyEmail: (userId: string, code: string) => Promise<void>;
  forgotPassword: (email: string, redirectUrl?: string) => Promise<void>;
  resetPassword: (
    userId: string,
    token: string,
    newPassword: string
  ) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchUser: () => Promise<User | null>;
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  getApi: () => AxiosInstance;
}

/**
 * Create the auth context
 */
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  auth: ForgebaseAuth;
  children: React.ReactNode;
}

/**
 * Auth provider component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  auth,
  children,
}) => {
  const [user, setUser] = useState<User | null>(auth.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // The auth instance should already be initialized in its constructor
        setUser(auth.getCurrentUser());
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setError(err instanceof AuthError ? err : null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [auth]);

  // Login handler
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await auth.login(credentials);
        setUser(response.user);
      } catch (err) {
        setError(err instanceof AuthError ? err : null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [auth]
  );

  // Register handler
  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await auth.register(credentials);
        setUser(response.user);
      } catch (err) {
        setError(err instanceof AuthError ? err : null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [auth]
  );

  // Logout handler
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await auth.logout();
      setUser(null);
    } catch (err) {
      setError(err instanceof AuthError ? err : null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  // Send verification email handler
  const sendVerificationEmail = useCallback(
    async (email: string, redirectUrl?: string) => {
      setError(null);
      try {
        return await auth.sendVerificationEmail(email, redirectUrl);
      } catch (err) {
        setError(err instanceof AuthError ? err : null);
        throw err;
      }
    },
    [auth]
  );

  // Verify email handler
  const verifyEmail = useCallback(
    async (userId: string, code: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await auth.verifyEmail(userId, code);
        if (response.user) {
          setUser(response.user);
        }
      } catch (err) {
        setError(err instanceof AuthError ? err : null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [auth]
  );

  // Forgot password handler
  const forgotPassword = useCallback(
    async (email: string, redirectUrl?: string) => {
      setError(null);
      try {
        await auth.forgotPassword(email, redirectUrl);
      } catch (err) {
        setError(err instanceof AuthError ? err : null);
        throw err;
      }
    },
    [auth]
  );

  // Reset password handler
  const resetPassword = useCallback(
    async (userId: string, token: string, newPassword: string) => {
      setError(null);
      try {
        await auth.resetPassword(userId, token, newPassword);
      } catch (err) {
        setError(err instanceof AuthError ? err : null);
        throw err;
      }
    },
    [auth]
  );

  // Refresh token handler
  const refreshToken = useCallback(async () => {
    setError(null);
    try {
      const result = await auth.refreshAccessToken();
      if (result) {
        setUser(result.user);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof AuthError ? err : null);
      return false;
    }
  }, [auth]);

  // Fetch user handler
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await auth.fetchUserDetails();
      setUser(user);
      return user;
    } catch (err) {
      setError(err instanceof AuthError ? err : null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  // Get access token
  const getAccessToken = useCallback(() => {
    return auth.getAccessToken();
  }, [auth]);

  // Get refresh token
  const getRefreshToken = useCallback(() => {
    return auth.getRefreshToken();
  }, [auth]);

  // Get API instance
  const getApi = useCallback(() => {
    return auth.api;
  }, [auth]);

  const value = {
    auth,
    user,
    isLoading,
    isAuthenticated: auth.isAuthenticated(),
    error,
    login,
    register,
    logout,
    sendVerificationEmail,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
    fetchUser,
    getAccessToken,
    getRefreshToken,
    getApi,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
