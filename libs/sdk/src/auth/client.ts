import type {
  AuthClientConfig,
  AuthResponse,
  AuthToken,
  EmailVerificationPayload,
  LoginCredentials,
  RegisterCredentials,
  BaseUser,
  TokenHandlingConfig,
} from './types';
import { StorageAdapter, StorageFactory } from './storage';

const DEFAULT_STORAGE_KEYS = {
  token: 'auth_token',
  user: 'auth_user',
} as const;

/**
 * Framework-agnostic authentication client for ForgeBase Auth
 * Works in both browser and server environments
 */
export class AuthClient<T extends BaseUser = BaseUser> {
  private config: Required<AuthClientConfig>;
  private currentUser: T | null = null;
  private tokenConfig: Required<TokenHandlingConfig>;
  private storage: StorageAdapter;

  constructor(config: AuthClientConfig) {
    // Set default configuration
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      paths: {
        login: '/auth/login',
        register: '/auth/register',
        refresh: '/auth/refresh',
        verifyEmail: '/auth/verify-email',
        logout: '/auth/logout',
        user: '/auth/me',
        ...config.paths,
      },
      storage: config.storage ?? StorageFactory.createStorage(),
      httpClient: {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        ...config.httpClient,
      },
      tokens: config.tokens || {},
    };

    this.storage = this.config.storage;

    // Set token configuration with defaults
    this.tokenConfig = {
      // Removed includeTokenHeader logic related to memory storage
      includeTokenHeader: this.config.tokens?.includeTokenHeader ?? true,
      headers: {
        authorization:
          this.config.tokens?.headers?.authorization ?? 'Authorization',
        refreshToken: this.config.tokens?.headers?.refreshToken ?? 'RToken',
      },
    };

    // Initialize by loading user from storage
    this.loadUserFromStorage();

    // Initialize auth state
    this.initializeAuthState().catch((error) => {
      console.error('Error initializing auth state:', error);
    });
  }

  /**
   * Initialize the auth state by checking stored token and fetching current user
   */
  private async initializeAuthState(): Promise<void> {
    const token = this.getAccessToken();
    if (token) {
      try {
        const user = await this.fetchCurrentUser();
        if (user) {
          this.updateUser(user);
        } else {
          this.clearAuth();
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        this.clearAuth();
      }
    }
  }

  /**
   * Fetch the current user from the server
   */
  private async fetchCurrentUser(): Promise<T | null> {
    try {
      const response = await this.makeRequest<{ user: T }>(
        this.config.paths.user,
        {
          method: 'GET',
        }
      );
      return response.user || null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  /**
   * Register a new user with the specified credentials
   * @param credentials User registration credentials that must include email and password
   */
  async register<R extends Record<string, unknown>>(
    credentials: RegisterCredentials<R>
  ): Promise<AuthResponse<T>> {
    try {
      const response = await this.makeRequest<AuthResponse<T>>(
        this.config.paths.register,
        {
          method: 'POST',
          body: JSON.stringify({ provider: 'local', ...credentials }),
        }
      );

      if (response.user && response.token) {
        this.handleAuthSuccess(response.user, response.token);
      }

      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Login a user
   * @param credentials User login credentials
   * @returns AuthResponse containing user and token information
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse<T>> {
    try {
      const response = await this.makeRequest<AuthResponse<T>>(
        this.config.paths.login,
        {
          method: 'POST',
          body: JSON.stringify({ provider: 'local', ...credentials }),
        }
      );

      if (response.user && response.token) {
        this.handleAuthSuccess(response.user, response.token);
      } else if (response.token) {
        // If we only got a token, fetch the user
        const user = await this.fetchCurrentUser();
        if (user) {
          this.updateUser(user);
          response.user = user;
        }
      }

      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Verify email with verification code
   * @param payload Email verification payload containing userId and code
   * @returns AuthResponse containing verification status
   */
  async verifyEmail(
    payload: EmailVerificationPayload
  ): Promise<AuthResponse<T>> {
    try {
      const response = await this.makeRequest<AuthResponse<T>>(
        this.config.paths.verifyEmail,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (response.user) {
        this.updateUser(response.user);
      }

      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Refresh the access token using a refresh token
   * @returns AuthResponse containing new tokens
   */
  async refreshToken(): Promise<AuthResponse<T>> {
    try {
      const response = await this.makeRequest<AuthResponse<T>>(
        this.config.paths.refresh,
        {
          method: 'POST',
        }
      );

      if (response.token) {
        this.storeTokens(response.token);
        // After token refresh, fetch latest user data
        const user = await this.fetchCurrentUser();
        if (user) {
          this.updateUser(user);
          response.user = user;
        }
      }

      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      if (token) {
        await this.makeRequest(this.config.paths.logout, {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Get the current authenticated user, optionally fetching from server
   * @param options.forceFetch Force fetching user from server
   * @returns Current user or null if not authenticated
   */
  async getCurrentUser(
    options: { forceFetch?: boolean } = {}
  ): Promise<T | null> {
    if (options.forceFetch) {
      const user = await this.fetchCurrentUser();
      if (user) {
        this.updateUser(user);
      }
      return user;
    }
    return this.currentUser;
  }

  /**
   * Check if the user is authenticated by validating token and user data
   * @param options.validateWithServer Validate authentication with server
   * @returns True if user is authenticated
   */
  async isAuthenticated(
    options: { validateWithServer?: boolean } = {}
  ): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    if (options.validateWithServer) {
      const user = await this.fetchCurrentUser();
      return !!user;
    }

    return !!this.currentUser;
  }

  /**
   * Get the current access token
   * @returns Access token (string) or AuthToken object, or null if not available
   */
  async getAccessToken(
    options: { validateWithServer?: boolean } = {}
  ): Promise<string | AuthToken | null> {
    // Always try to get token if using memory storage
    // Otherwise, only get token if headers are enabled
    if (!this.tokenConfig.includeTokenHeader) {
      return null;
    }

    // For now always check this.fetchCurrentUser
    // to ensure that we are not using an expired token
    // if (options.validateWithServer) {
    const user = await this.getCurrentUser({ forceFetch: true });
    if (!user) {
      return null;
    }
    // }

    const token = this.getFromStorage(DEFAULT_STORAGE_KEYS.token);
    if (!token) return null;

    try {
      // Try to parse as AuthToken
      const authToken = JSON.parse(token);
      if (authToken.accessToken && authToken.refreshToken) {
        return authToken;
      }
    } catch {
      // If parsing fails, it's a string token
      return token;
    }
    return token;
  }

  private handleAuthSuccess(user: T, token: AuthToken | string): void {
    this.storeTokens(token);
    this.storeUser(user);
    this.currentUser = user;
  }

  private handleError(error: unknown): AuthResponse<T> {
    console.error('Auth error:', error);
    const message =
      error instanceof Error ? error.message : 'An error occurred';
    return { error: message };
  }

  private updateUser(user: T): void {
    this.currentUser = user;
    this.storeUser(user);
  }

  private clearAuth(): void {
    this.currentUser = null;
    this.clearStorage();
  }

  private storeTokens(token: AuthToken | string): void {
    // Only store tokens if we're using memory storage or if headers are enabled
    if (this.tokenConfig.includeTokenHeader) {
      if (typeof token === 'string') {
        this.storeInStorage(DEFAULT_STORAGE_KEYS.token, token);
      } else {
        this.storeInStorage(DEFAULT_STORAGE_KEYS.token, JSON.stringify(token));
      }
    }
  }

  private storeUser(user: T): void {
    this.storeInStorage(DEFAULT_STORAGE_KEYS.user, JSON.stringify(user));
  }

  private loadUserFromStorage(): void {
    const userJson = this.getFromStorage(DEFAULT_STORAGE_KEYS.user);
    if (userJson) {
      try {
        this.currentUser = JSON.parse(userJson);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.clearAuth();
      }
    }
  }

  private async makeRequest<R>(
    path: string,
    options: RequestInit = {}
  ): Promise<R> {
    const token = await this.getAccessToken();
    const headers = new Headers(this.config.httpClient.headers);

    // Add token headers if:
    // 1. Using memory storage (server-side) OR
    // 2. Headers are explicitly enabled and we have a token
    if (this.tokenConfig.includeTokenHeader && token) {
      if (typeof token === 'string') {
        headers.set(this.tokenConfig.headers.authorization, `Bearer ${token}`);
      } else if (token.accessToken) {
        headers.set(
          this.tokenConfig.headers.authorization,
          `Bearer ${token.accessToken}`
        );
        // Add refresh token header only for refresh requests
        if (token.refreshToken && path === this.config.paths.refresh) {
          headers.set(
            this.tokenConfig.headers.refreshToken,
            token.refreshToken
          );
        }
      }
    }

    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: this.config.httpClient.credentials,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  private storeInStorage(key: string, value: string): void {
    this.storage.set(key, value);
  }

  private getFromStorage(key: string): string | null {
    return this.storage.get(key);
  }

  private clearStorage(): void {
    this.storage.clear();
  }
}
