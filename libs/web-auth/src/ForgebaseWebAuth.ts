import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  AuthError,
  AuthErrorType,
  AuthResponse,
  AuthStorage,
  ChangePasswordResponse,
  ForgebaseWebAuthConfig,
  LoginCredentials,
  PasswordResetResponse,
  RegisterCredentials,
  StorageType,
  User,
  VerifyEmailResponse,
  VerifyResetTokenResponse,
} from './types';
import { STORAGE_KEYS, createStorage } from './storage';
import { isSSR, isTokenExpired } from './utils';

/**
 * ForgebaseWebAuth SDK for web applications with SSR support
 */
export class ForgebaseWebAuth {
  private _api: AxiosInstance;
  private storage: AuthStorage;
  private currentUser: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private config: ForgebaseWebAuthConfig;
  private refreshPromise: Promise<AuthResponse | null> | null = null;

  apiUrl = '';

  /**
   * Create a new ForgebaseWebAuth instance
   * @param config Configuration options
   */
  constructor(config: ForgebaseWebAuthConfig) {
    this.config = {
      storageType: StorageType.COOKIE,
      useCookies: true,
      withCredentials: true,
      timeout: 10000,
      ssr: isSSR(),
      ...config,
    };

    this.apiUrl = config.apiUrl;

    // Set up storage
    this.storage =
      config.storage ||
      createStorage(this.config.storageType as StorageType, {
        domain: this.config.cookieDomain,
        path: this.config.cookiePath,
        secure: this.config.secureCookies,
        httpOnly: this.config.httpOnlyCookies,
        sameSite: this.config.sameSite,
      });

    // Create axios instance with base configuration
    this._api = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      withCredentials: this.config.withCredentials,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.config.headers,
      },
    });

    // Add request interceptor to include auth token
    this._api.interceptors.request.use(
      async (config) => {
        // Apply custom request interceptor if provided
        if (this.config.requestInterceptor) {
          config = await this.config.requestInterceptor(config);
        }

        // Skip token handling in SSR mode if using cookies
        if (this.config.ssr && this.config.useCookies) {
          return config;
        }

        // If we don't have the token in memory, try to get it from storage
        if (!this.accessToken) {
          this.accessToken = await this.storage.getItem(
            STORAGE_KEYS.ACCESS_TOKEN
          );
        }

        // If we don't have the refresh token in memory, try to get it from storage
        if (!this.refreshToken) {
          this.refreshToken = await this.storage.getItem(
            STORAGE_KEYS.REFRESH_TOKEN
          );
        }

        // If we have a token and not using cookies, add it to the request headers
        if (this.accessToken && !this.config.useCookies && config.headers) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;

          // Add refresh token to headers if available
          if (this.refreshToken) {
            config.headers['X-Refresh-Token'] = this.refreshToken;
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle errors and token refresh
    this._api.interceptors.response.use(
      async (response: AxiosResponse) => {
        // Apply custom response interceptor if provided
        if (this.config.responseInterceptor) {
          return this.config.responseInterceptor(response);
        }
        return response;
      },
      async (error: AxiosError) => {
        // Apply custom error interceptor if provided
        if (this.config.errorInterceptor) {
          const result = await this.config.errorInterceptor(error);
          if (result !== undefined) {
            return result;
          }
        }

        const statusCode = error.response?.status;
        const errorData = error.response?.data as Record<string, unknown>;
        const originalRequest = error.config;

        // Handle different error types
        if (!error.response) {
          throw new AuthError(
            'Network error. Please check your internet connection.',
            AuthErrorType.NETWORK_ERROR
          );
        }

        // Handle token expiration - attempt to refresh token
        if (
          statusCode === 401 &&
          originalRequest &&
          !(originalRequest as unknown as { _retry?: boolean })._retry
        ) {
          // Skip token refresh in SSR mode
          if (this.config.ssr) {
            throw new AuthError(
              'Authentication required. Please login.',
              AuthErrorType.SSR_ERROR,
              statusCode
            );
          }

          // Mark the request as retried to prevent infinite loops
          (originalRequest as unknown as { _retry?: boolean })._retry = true;

          try {
            // Try to refresh the token
            const refreshResult = await this.refreshAccessToken();

            if (refreshResult) {
              // Update the Authorization header with the new token
              if (!this.config.useCookies && originalRequest.headers) {
                originalRequest.headers[
                  'Authorization'
                ] = `Bearer ${this.accessToken}`;
              }

              // Retry the original request with the new token
              return this._api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Continue with the error handling below
          }
        }

        switch (statusCode) {
          case 400:
            throw new AuthError(
              (errorData?.['error'] as string) || 'Invalid request',
              AuthErrorType.INVALID_CREDENTIALS,
              statusCode
            );
          case 401:
            // Only clear tokens if we couldn't refresh
            this.clearTokens();
            throw new AuthError(
              (errorData?.['error'] as string) || 'Unauthorized',
              AuthErrorType.INVALID_TOKEN,
              statusCode
            );
          case 404:
            throw new AuthError(
              (errorData?.['error'] as string) || 'Resource not found',
              AuthErrorType.USER_NOT_FOUND,
              statusCode
            );
          case 409:
            throw new AuthError(
              (errorData?.['error'] as string) || 'Conflict',
              AuthErrorType.EMAIL_ALREADY_EXISTS,
              statusCode
            );
          case 403:
            throw new AuthError(
              (errorData?.['error'] as string) || 'Verification required',
              AuthErrorType.VERIFICATION_REQUIRED,
              statusCode
            );
          case 500:
            throw new AuthError(
              (errorData?.['error'] as string) || 'Server error',
              AuthErrorType.SERVER_ERROR,
              statusCode
            );
          default:
            throw new AuthError(
              (errorData?.['error'] as string) || 'Unknown error',
              AuthErrorType.UNKNOWN_ERROR,
              statusCode
            );
        }
      }
    );

    // Initialize by loading user from storage
    if (!this.config.ssr) {
      this.initialize();
    }
  }

  /**
   * Initialize the SDK by loading tokens from storage
   */
  private async initialize(): Promise<void> {
    try {
      this.accessToken = await this.storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      this.refreshToken = await this.storage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      );

      // If we have a token, try to fetch the user
      if (this.accessToken && !this.config.ssr) {
        try {
          await this.fetchUserDetails();
        } catch (error) {
          console.error(
            'Failed to fetch user details during initialization:',
            error
          );
        }
      }
    } catch (error) {
      console.error('Failed to initialize ForgebaseWebAuth:', error);
    }
  }

  /**
   * Store authentication data
   * @param response Authentication response from the server
   */
  private async storeAuthData(response: AuthResponse): Promise<void> {
    this.currentUser = response.user;

    // Handle different token formats
    if (typeof response.token === 'string') {
      this.accessToken = response.token;
      await this.storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.token);
    } else {
      this.accessToken = response.token.accessToken;
      await this.storage.setItem(
        STORAGE_KEYS.ACCESS_TOKEN,
        response.token.accessToken
      );

      if (response.token.refreshToken) {
        this.refreshToken = response.token.refreshToken;
        await this.storage.setItem(
          STORAGE_KEYS.REFRESH_TOKEN,
          response.token.refreshToken
        );
      }
    }
  }

  /**
   * Clear all authentication tokens and user data
   */
  private async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;

    await this.storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await this.storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Register a new user with email and password
   * @param credentials Registration credentials
   * @returns Authentication response
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await this._api.post<AuthResponse>('/auth/register', {
        provider: 'local',
        ...credentials,
      });

      await this.storeAuthData(response.data);
      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Registration failed', AuthErrorType.UNKNOWN_ERROR);
    }
  }

  /**
   * Login with email and password
   * @param credentials Login credentials
   * @returns Authentication response
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this._api.post<AuthResponse>('/auth/login', {
        provider: 'local',
        ...credentials,
      });

      await this.storeAuthData(response.data);
      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Login failed', AuthErrorType.UNKNOWN_ERROR);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      // Call the logout endpoint if available
      if (this.accessToken || this.config.useCookies) {
        await this._api.get('/auth/logout');
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Always clear tokens even if the request fails
      await this.clearTokens();
    }
  }

  /**
   * Get the current authenticated user
   * @returns The current user or null if not authenticated
   * @deprecated Use fetchUserDetails() instead to always get fresh user data
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get the current authenticated user, fetching from server if needed
   * @returns Promise resolving to the current user or null if not authenticated
   */
  async getUser(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      console.log('Not authenticated');
      return null;
    }

    try {
      return await this.fetchUserDetails();
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      return null;
    }
  }

  /**
   * Check if the user is authenticated
   * @returns True if the user is authenticated
   */
  isAuthenticated(): boolean {
    // In SSR mode with cookies, we can't determine authentication status
    if (this.config.ssr && this.config.useCookies) {
      return false;
    }

    // Check if we have a token and it's not expired
    if (this.accessToken && !isTokenExpired(this.accessToken)) {
      return true;
    }

    // If we have a refresh token, we can potentially refresh
    if (this.refreshToken) {
      return true;
    }

    return false;
  }

  /**
   * Fetch the current user details from the server
   * @returns The user details from the server
   */
  async fetchUserDetails(): Promise<User> {
    try {
      const response = await this._api.get<{ user: User }>('/auth/me');

      // Update the in-memory user
      this.currentUser = response.data.user;

      return response.data.user;
    } catch (error) {
      // If the error is due to an expired token, try to refresh it
      if (error instanceof AuthError && error.statusCode === 401) {
        const refreshResult = await this.refreshAccessToken();

        if (refreshResult) {
          // Retry the request with the new token
          return this.fetchUserDetails();
        }
      }

      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Failed to fetch user details',
        AuthErrorType.UNKNOWN_ERROR
      );
    }
  }

  /**
   * Send a verification email to the user
   * @param email Email address to verify
   * @param redirectUrl Optional custom redirect URL for the verification link
   * @returns Response with success status and optional verification token
   */
  async sendVerificationEmail(
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; token?: string }> {
    try {
      const payload: Record<string, string> = { email };
      if (redirectUrl) {
        payload['redirectUrl'] = redirectUrl;
      }

      const response = await this._api.post<{
        success: boolean;
        token?: string;
      }>('/auth/send-verification-email', payload);

      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Failed to send verification email',
        AuthErrorType.UNKNOWN_ERROR
      );
    }
  }

  /**
   * Verify an email with a verification code
   * @param userId User ID
   * @param code Verification code
   * @returns Verification response
   */
  async verifyEmail(
    userId: string,
    code: string
  ): Promise<VerifyEmailResponse> {
    try {
      const response = await this._api.post<VerifyEmailResponse>(
        '/auth/verify-email',
        {
          userId,
          code,
        }
      );

      // If the response includes updated user data, update the in-memory user
      if (response.data.user) {
        this.currentUser = response.data.user;
      }

      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Email verification failed',
        AuthErrorType.UNKNOWN_ERROR
      );
    }
  }

  /**
   * Request a password reset email
   * @param email Email address
   * @param redirectUrl Optional custom redirect URL for the reset link
   * @returns Password reset response
   */
  async forgotPassword(
    email: string,
    redirectUrl?: string
  ): Promise<PasswordResetResponse> {
    try {
      const payload: Record<string, string> = { email };
      if (redirectUrl) {
        payload['redirectUrl'] = redirectUrl;
      }

      const response = await this._api.post<PasswordResetResponse>(
        '/auth/forgot-password',
        payload
      );

      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Failed to request password reset',
        AuthErrorType.UNKNOWN_ERROR
      );
    }
  }

  /**
   * Verify a password reset token
   * @param userId User ID
   * @param token Reset token
   * @returns Token verification response
   */
  async verifyResetToken(
    userId: string,
    token: string
  ): Promise<VerifyResetTokenResponse> {
    try {
      const response = await this._api.post<VerifyResetTokenResponse>(
        '/auth/verify-reset-token',
        {
          userId,
          token,
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Failed to verify reset token',
        AuthErrorType.UNKNOWN_ERROR
      );
    }
  }

  /**
   * Reset password with a token
   * @param userId User ID
   * @param token Reset token
   * @param newPassword New password
   * @returns Password reset response
   */
  async resetPassword(
    userId: string,
    token: string,
    newPassword: string
  ): Promise<PasswordResetResponse> {
    try {
      const response = await this._api.post<PasswordResetResponse>(
        '/auth/reset-password',
        {
          userId,
          token,
          newPassword,
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Password reset failed', AuthErrorType.UNKNOWN_ERROR);
    }
  }

  /**
   * Change password for the authenticated user
   * @param oldPassword Current password
   * @param newPassword New password
   * @returns Change password response
   */
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResponse> {
    try {
      // Check if user is authenticated
      if (!this.isAuthenticated() && !this.config.ssr) {
        throw new AuthError(
          'User must be authenticated to change password',
          AuthErrorType.UNAUTHORIZED
        );
      }

      const response = await this._api.post<ChangePasswordResponse>(
        '/auth/change-password',
        {
          oldPassword,
          newPassword,
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Password change failed',
        AuthErrorType.UNKNOWN_ERROR
      );
    }
  }

  /**
   * Get the current access token
   * @returns The current access token or null if not authenticated
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get the current refresh token
   * @returns The current refresh token or null if not available
   */
  async getRefreshToken(): Promise<string | null> {
    if (!this.refreshToken) {
      this.refreshToken = await this.storage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      );
    }
    return this.refreshToken;
  }

  /**
   * Refresh the access token using the refresh token
   * @returns The new authentication response or null if refresh failed
   */
  async refreshAccessToken(): Promise<AuthResponse | null> {
    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Create a new refresh promise
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();

        if (!refreshToken) {
          return null;
        }

        // Call the refresh token endpoint
        const response = await this._api.post<{
          success: boolean;
          token: string;
        }>('/auth/refresh-token', {
          refreshToken,
        });

        if (response.data.success && response.data.token) {
          // Store the new token
          this.accessToken = response.data.token;
          await this.storage.setItem(
            STORAGE_KEYS.ACCESS_TOKEN,
            response.data.token
          );

          // Fetch the user details with the new token
          try {
            const user = await this.fetchUserDetails();

            // Create a proper AuthResponse object
            const authResponse: AuthResponse = {
              user,
              token: response.data.token,
            };

            return authResponse;
          } catch (userError) {
            console.error(
              'Failed to fetch user after token refresh:',
              userError
            );
            // Even if we can't fetch the user, we still have a valid token
            // Return a partial response with the token but no user
            return {
              token: response.data.token,
              user: this.currentUser || ({} as User),
            };
          }
        }

        return null;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Clear tokens on refresh failure
        await this.clearTokens();
        return null;
      } finally {
        // Clear the refresh promise
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Get the configured axios instance with authentication interceptors
   * This allows developers to make authenticated API calls directly
   * @returns The configured axios instance
   */
  get api(): AxiosInstance {
    return this._api;
  }

  /**
   * Get the auth interceptors to apply to another axios instance
   * This allows developers to add authentication to their own axios instances
   * @returns Object containing request and response interceptors
   */
  getAuthInterceptors() {
    return {
      request: async (config: any) => {
        // Skip token handling in SSR mode if using cookies
        if (this.config.ssr && this.config.useCookies) {
          return config;
        }

        // If we don't have the token in memory, try to get it from storage
        if (!this.accessToken) {
          this.accessToken = await this.storage.getItem(
            STORAGE_KEYS.ACCESS_TOKEN
          );
        }

        // If we don't have the refresh token in memory, try to get it from storage
        if (!this.refreshToken) {
          this.refreshToken = await this.storage.getItem(
            STORAGE_KEYS.REFRESH_TOKEN
          );
        }

        // If we have a token and not using cookies, add it to the request headers
        if (this.accessToken && !this.config.useCookies && config.headers) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;

          // Add refresh token to headers if available
          if (this.refreshToken) {
            config.headers['X-Refresh-Token'] = this.refreshToken;
          }
        }

        return config;
      },
      response: {
        onFulfilled: async (response: AxiosResponse) => {
          return response;
        },
        onRejected: async (error: AxiosError) => {
          const statusCode = error.response?.status;
          const errorData = error.response?.data as Record<string, unknown>;
          const originalRequest = error.config;

          // Handle different error types
          if (!error.response) {
            throw new AuthError(
              'Network error. Please check your internet connection.',
              AuthErrorType.NETWORK_ERROR
            );
          }

          // Handle token expiration - attempt to refresh token
          if (
            statusCode === 401 &&
            originalRequest &&
            !(originalRequest as unknown as { _retry?: boolean })._retry
          ) {
            // Skip token refresh in SSR mode
            if (this.config.ssr) {
              throw new AuthError(
                'Authentication required. Please login.',
                AuthErrorType.SSR_ERROR,
                statusCode
              );
            }

            // Mark the request as retried to prevent infinite loops
            (originalRequest as unknown as { _retry?: boolean })._retry = true;

            try {
              // Try to refresh the token
              const refreshResult = await this.refreshAccessToken();

              if (refreshResult) {
                // Update the Authorization header with the new token
                if (!this.config.useCookies && originalRequest.headers) {
                  originalRequest.headers[
                    'Authorization'
                  ] = `Bearer ${this.accessToken}`;
                }

                // Return a new axios instance to retry the original request
                return axios(originalRequest);
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              // Continue with the error handling below
            }
          }

          switch (statusCode) {
            case 400:
              throw new AuthError(
                (errorData?.['error'] as string) || 'Invalid request',
                AuthErrorType.INVALID_CREDENTIALS,
                statusCode
              );
            case 401:
              // Only clear tokens if we couldn't refresh
              this.clearTokens();
              throw new AuthError(
                (errorData?.['error'] as string) || 'Unauthorized',
                AuthErrorType.INVALID_TOKEN,
                statusCode
              );
            case 404:
              throw new AuthError(
                (errorData?.['error'] as string) || 'Resource not found',
                AuthErrorType.USER_NOT_FOUND,
                statusCode
              );
            case 409:
              throw new AuthError(
                (errorData?.['error'] as string) || 'Conflict',
                AuthErrorType.EMAIL_ALREADY_EXISTS,
                statusCode
              );
            case 403:
              throw new AuthError(
                (errorData?.['error'] as string) || 'Verification required',
                AuthErrorType.VERIFICATION_REQUIRED,
                statusCode
              );
            case 500:
              throw new AuthError(
                (errorData?.['error'] as string) || 'Server error',
                AuthErrorType.SERVER_ERROR,
                statusCode
              );
            default:
              throw new AuthError(
                (errorData?.['error'] as string) || 'Unknown error',
                AuthErrorType.UNKNOWN_ERROR,
                statusCode
              );
          }
        },
      },
    };
  }

  /**
   * Apply auth interceptors to an external axios instance
   * This allows developers to add authentication to their own axios instances
   * @param axiosInstance The axios instance to apply interceptors to
   * @returns The axios instance with auth interceptors applied
   */
  applyAuthInterceptors(axiosInstance: AxiosInstance): AxiosInstance {
    const interceptors = this.getAuthInterceptors();

    // Add request interceptor
    axiosInstance.interceptors.request.use(interceptors.request);

    // Add response interceptors
    axiosInstance.interceptors.response.use(
      interceptors.response.onFulfilled,
      interceptors.response.onRejected
    );

    return axiosInstance;
  }

  /**
   * Set initial user and tokens from SSR context
   * This method should be called in SSR environments to hydrate the auth state
   * @param user User object
   * @param accessToken Access token
   * @param refreshToken Refresh token
   */
  setInitialState(
    user: User | null,
    accessToken?: string,
    refreshToken?: string
  ): void {
    this.currentUser = user;

    if (accessToken) {
      this.accessToken = accessToken;
      if (!this.config.ssr) {
        this.storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      }
    }

    if (refreshToken) {
      this.refreshToken = refreshToken;
      if (!this.config.ssr) {
        this.storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    }

    // Store user in memory only, not in storage
    // This ensures we always fetch fresh user data when needed
  }
}
