import { Injectable, NgModule, Provider, signal } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ForgebaseWebAuth } from '../../ForgebaseWebAuth';
import {
  ForgebaseWebAuthConfig,
  User,
  AuthError,
  LoginCredentials,
  RegisterCredentials,
} from '../../types';

/**
 * Angular service for ForgebaseWebAuth
 */
@Injectable({ providedIn: 'root' })
export class ForgebaseAuthService {
  private auth!: ForgebaseWebAuth;

  // Signals for reactive state
  public user = signal<User | null>(null);
  public isLoading = signal<boolean>(false);
  public isAuthenticated = signal<boolean>(false);
  public currentError = signal<AuthError | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Initialize the auth service
   */
  initialize(config: ForgebaseWebAuthConfig): void {
    this.auth = new ForgebaseWebAuth(config);
    this.loadInitialState();
  }

  /**
   * Load the initial auth state
   */
  private async loadInitialState(): Promise<void> {
    this.isLoading.set(true);

    try {
      if (this.auth.isAuthenticated()) {
        const user = await this.auth.fetchUserDetails();
        this.user.set(user);
        this.isAuthenticated.set(true);
      } else {
        this.user.set(this.auth.getCurrentUser());
        this.isAuthenticated.set(this.auth.isAuthenticated());
      }
    } catch (error) {
      console.error('Failed to load initial auth state:', error);
      this.currentError.set(error instanceof AuthError ? error : null);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<void> {
    this.isLoading.set(true);
    this.currentError.set(null);

    try {
      const response = await this.auth.login(credentials);
      this.user.set(response.user);
      this.isAuthenticated.set(true);
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<void> {
    this.isLoading.set(true);
    this.currentError.set(null);

    try {
      const response = await this.auth.register(credentials);
      this.user.set(response.user);
      this.isAuthenticated.set(true);
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    this.isLoading.set(true);
    this.currentError.set(null);

    try {
      await this.auth.logout();
      this.user.set(null);
      this.isAuthenticated.set(false);
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; token?: string }> {
    this.currentError.set(null);

    try {
      return await this.auth.sendVerificationEmail(email, redirectUrl);
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string, code: string): Promise<void> {
    this.isLoading.set(true);
    this.currentError.set(null);

    try {
      const response = await this.auth.verifyEmail(userId, code);
      if (response.user) {
        this.user.set(response.user);
      }
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string, redirectUrl?: string): Promise<void> {
    this.currentError.set(null);

    try {
      await this.auth.forgotPassword(email, redirectUrl);
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(
    userId: string,
    token: string,
    newPassword: string
  ): Promise<void> {
    this.currentError.set(null);

    try {
      await this.auth.resetPassword(userId, token, newPassword);
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      throw error;
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<boolean> {
    this.currentError.set(null);

    try {
      const result = await this.auth.refreshAccessToken();
      if (result) {
        this.user.set(result.user);
        this.isAuthenticated.set(true);
        return true;
      }
      return false;
    } catch (error) {
      this.currentError.set(error instanceof AuthError ? error : null);
      return false;
    }
  }

  /**
   * Get the access token
   */
  getAccessToken(): string | null {
    return this.auth.getAccessToken();
  }

  /**
   * Get the API instance
   */
  get api() {
    return this.auth.api;
  }
}

/**
 * HTTP interceptor for handling authentication
 */
@Injectable()
export class ForgebaseAuthInterceptor implements HttpInterceptor {
  constructor(private authService: ForgebaseAuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Get the access token
    const accessToken = this.authService.getAccessToken();

    // Add the token to the request if available
    if (accessToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    // Handle the request
    return next.handle(request).pipe(
      catchError((error) => {
        // Handle 401 errors by refreshing the token
        if (error.status === 401) {
          return this.handle401Error(request, next);
        }

        return throwError(() => error);
      })
    );
  }

  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return from(this.authService.refreshToken()).pipe(
      switchMap((success) => {
        if (success) {
          const accessToken = this.authService.getAccessToken();
          if (accessToken) {
            return next.handle(this.addTokenToRequest(request, accessToken));
          }
        }

        // If refresh failed, redirect to login
        // This could be handled by a router guard or service
        return throwError(
          () => new Error('Session expired. Please login again.')
        );
      })
    );
  }

  private addTokenToRequest(
    request: HttpRequest<unknown>,
    token: string
  ): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

/**
 * Configuration for ForgebaseAuth
 */
export interface ForgebaseAuthConfig {
  /**
   * Auth configuration
   */
  authConfig: ForgebaseWebAuthConfig;
}

/**
 * Provider for ForgebaseAuth
 */
export function provideForgebaseAuth(
  config: ForgebaseWebAuthConfig
): Provider[] {
  return [
    {
      provide: 'FORGEBASE_AUTH_CONFIG',
      useValue: config,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ForgebaseAuthInterceptor,
      multi: true,
    },
  ];
}

/**
 * Angular module for ForgebaseWebAuth
 */
@NgModule({
  providers: [
    ForgebaseAuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ForgebaseAuthInterceptor,
      multi: true,
    },
  ],
})
export class ForgebaseAuthModule {
  static forRoot(config: ForgebaseWebAuthConfig) {
    return {
      ngModule: ForgebaseAuthModule,
      providers: [
        {
          provide: 'FORGEBASE_AUTH_CONFIG',
          useValue: config,
        },
      ],
    };
  }
}
