import {
  InjectionToken,
  Injectable,
  signal,
  computed,
  inject,
  effect,
  makeEnvironmentProviders,
  EnvironmentProviders,
} from '@angular/core';
import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { ForgebaseWebAuth } from '../ForgebaseWebAuth';
import {
  AuthError,
  ForgebaseWebAuthConfig,
  LoginCredentials,
  RegisterCredentials,
  StorageType,
  User,
} from '../types';

/**
 * Injection token for ForgebaseWebAuth configuration
 */
export const FORGEBASE_AUTH_CONFIG = new InjectionToken<ForgebaseWebAuthConfig>(
  'FORGEBASE_AUTH_CONFIG'
);

/**
 * Modern Angular service for ForgebaseWebAuth using Signals
 */
@Injectable({ providedIn: 'root' })
export class ForgebaseAuthService {
  private auth: ForgebaseWebAuth;

  // Signal-based state
  private refreshingToken = signal(false);

  // Public signals
  readonly user = signal<User | null>(null);
  readonly loading = signal(false);
  readonly authenticated = signal(false);
  readonly error = signal<AuthError | null>(null);

  // Computed values
  readonly isAuthenticated = computed(() => this.authenticated());
  readonly isLoading = computed(() => this.loading());
  readonly currentUser = computed(() => this.user());
  readonly currentError = computed(() => this.error());

  constructor() {
    // Inject configuration
    const config = inject(FORGEBASE_AUTH_CONFIG, { optional: true });

    this.auth = new ForgebaseWebAuth(
      config || {
        apiUrl: '',
        storageType: StorageType.COOKIE,
      }
    );

    // Initialize auth state
    this.initialize();

    // Set up effect to log errors
    effect(() => {
      const currentError = this.error();
      if (currentError) {
        console.error('Auth error:', currentError);
      }
    });
  }

  /**
   * Initialize the auth service
   */
  private async initialize(): Promise<void> {
    this.loading.set(true);

    try {
      // Check if we have a token
      if (this.auth.isAuthenticated()) {
        // Try to fetch user details
        const user = await this.auth.fetchUserDetails();
        this.user.set(user);
        this.authenticated.set(true);
      } else {
        // Get the current user from storage
        const user = this.auth.getCurrentUser();
        this.user.set(user);
        this.authenticated.set(this.auth.isAuthenticated());
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.error.set(error instanceof AuthError ? error : null);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get the ForgebaseWebAuth instance
   */
  getInstance(): ForgebaseWebAuth {
    return this.auth;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.auth.getAccessToken();
  }

  /**
   * Get the current refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return this.auth.getRefreshToken();
  }

  /**
   * Get the axios instance
   */
  getAxiosInstance(): unknown {
    return this.auth.api;
  }

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<User> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.auth.register(credentials);
      this.user.set(response.user);
      this.authenticated.set(true);
      return response.user;
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<User> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.auth.login(credentials);
      this.user.set(response.user);
      this.authenticated.set(true);
      return response.user;
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.logout();
      this.user.set(null);
      this.authenticated.set(false);
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fetch the latest user details
   */
  async fetchUser(): Promise<User> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const user = await this.auth.fetchUserDetails();
      this.user.set(user);
      return user;
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<boolean> {
    if (this.refreshingToken()) {
      return new Promise<boolean>((resolve) => {
        // Wait for the current refresh to complete
        const checkRefresh = effect(() => {
          if (!this.refreshingToken()) {
            resolve(this.authenticated());
            checkRefresh.destroy();
          }
        });
      });
    }

    this.refreshingToken.set(true);

    try {
      const result = await this.auth.refreshAccessToken();

      if (result) {
        this.user.set(result.user);
        this.authenticated.set(true);
        return true;
      }

      this.user.set(null);
      this.authenticated.set(false);
      return false;
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      return false;
    } finally {
      this.refreshingToken.set(false);
    }
  }

  /**
   * Send a verification email
   */
  async sendVerificationEmail(
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; token?: string }> {
    this.error.set(null);

    try {
      return await this.auth.sendVerificationEmail(email, redirectUrl);
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    }
  }

  /**
   * Verify an email
   */
  async verifyEmail(userId: string, code: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.auth.verifyEmail(userId, code);

      if (response.user) {
        this.user.set(response.user);
      }
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Request a password reset
   */
  async forgotPassword(email: string, redirectUrl?: string): Promise<void> {
    this.error.set(null);

    try {
      await this.auth.forgotPassword(email, redirectUrl);
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    }
  }

  /**
   * Reset a password
   */
  async resetPassword(
    userId: string,
    token: string,
    newPassword: string
  ): Promise<void> {
    this.error.set(null);

    try {
      await this.auth.resetPassword(userId, token, newPassword);
    } catch (error) {
      this.error.set(error instanceof AuthError ? error : null);
      throw error;
    }
  }
}

/**
 * HTTP interceptor for adding auth tokens to requests
 */
export const forgebaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(ForgebaseAuthService);

  // Skip if the request is to an external domain
  if (!req.url.startsWith('/') && !req.url.includes(window.location.origin)) {
    return next(req);
  }

  // Get the access token
  const accessToken = authService.getAccessToken();

  // If we have a token, add it to the request
  if (accessToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  // Handle the request
  return next(req).pipe(
    catchError((error) => {
      // Check if the error is due to an expired token
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh-token')
      ) {
        return handle401Error(req, next, authService);
      }

      return throwError(() => error);
    })
  );
};

/**
 * Handle 401 errors by refreshing the token
 */
function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: ForgebaseAuthService
): Observable<HttpEvent<unknown>> {
  return from(authService.refreshToken()).pipe(
    switchMap((success) => {
      if (success) {
        const accessToken = authService.getAccessToken();
        if (accessToken) {
          const authReq = request.clone({
            setHeaders: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          return next(authReq);
        }
      }

      // If refresh failed, redirect to login
      return throwError(
        () => new Error('Session expired. Please login again.')
      );
    })
  );
}

/**
 * Provide ForgebaseAuth for standalone components
 */
export function provideForgebaseAuth(
  config: ForgebaseWebAuthConfig
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FORGEBASE_AUTH_CONFIG, useValue: config },
    ForgebaseAuthService,
    provideHttpClient(withInterceptors([forgebaseAuthInterceptor])),
  ]);
}
