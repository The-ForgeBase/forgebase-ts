import { Injectable, InjectionToken, NgModule } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

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
 * Angular service for ForgebaseWebAuth
 */
@Injectable({
  providedIn: 'root',
})
export class ForgebaseAuthService {
  private auth: ForgebaseWebAuth;
  private refreshingToken = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  // Observables for reactive state
  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<AuthError | null>(null);

  /**
   * Observable of the current user
   */
  readonly user$ = this.userSubject.asObservable();

  /**
   * Observable of the loading state
   */
  readonly loading$ = this.loadingSubject.asObservable();

  /**
   * Observable of the authentication state
   */
  readonly authenticated$ = this.authenticatedSubject.asObservable();

  /**
   * Observable of the current error
   */
  readonly error$ = this.errorSubject.asObservable();

  constructor(config: ForgebaseWebAuthConfig) {
    this.auth = new ForgebaseWebAuth(
      config || {
        apiUrl: '',
        storageType: StorageType.COOKIE,
      }
    );

    this.initialize();
  }

  /**
   * Initialize the auth service
   */
  private async initialize(): Promise<void> {
    this.loadingSubject.next(true);

    try {
      // Check if we have a token
      if (this.auth.isAuthenticated()) {
        // Try to fetch user details
        const user = await this.auth.fetchUserDetails();
        this.userSubject.next(user);
        this.authenticatedSubject.next(true);
      } else {
        // Get the current user from storage
        const user = this.auth.getCurrentUser();
        this.userSubject.next(user);
        this.authenticatedSubject.next(this.auth.isAuthenticated());
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.errorSubject.next(error instanceof AuthError ? error : null);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get the ForgebaseWebAuth instance
   */
  getInstance(): ForgebaseWebAuth {
    return this.auth;
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
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
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const response = await this.auth.register(credentials);
      this.userSubject.next(response.user);
      this.authenticatedSubject.next(true);
      return response.user;
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<User> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const response = await this.auth.login(credentials);
      this.userSubject.next(response.user);
      this.authenticatedSubject.next(true);
      return response.user;
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      await this.auth.logout();
      this.userSubject.next(null);
      this.authenticatedSubject.next(false);
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Fetch the latest user details
   */
  async fetchUser(): Promise<User> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const user = await this.auth.fetchUserDetails();
      this.userSubject.next(user);
      return user;
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<boolean> {
    if (this.refreshingToken) {
      return new Promise<boolean>((resolve) => {
        this.refreshTokenSubject
          .pipe(
            filter((token) => token !== null),
            take(1)
          )
          .subscribe(() => resolve(true));
      });
    }

    this.refreshingToken = true;
    this.refreshTokenSubject.next(null);

    try {
      const result = await this.auth.refreshAccessToken();

      if (result) {
        this.userSubject.next(result.user);
        this.authenticatedSubject.next(true);
        this.refreshTokenSubject.next(
          typeof result.token === 'string'
            ? result.token
            : result.token.accessToken
        );
        return true;
      }

      this.userSubject.next(null);
      this.authenticatedSubject.next(false);
      this.refreshTokenSubject.next(null);
      return false;
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      this.refreshTokenSubject.next(null);
      return false;
    } finally {
      this.refreshingToken = false;
    }
  }

  /**
   * Send a verification email
   */
  async sendVerificationEmail(
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; token?: string }> {
    this.errorSubject.next(null);

    try {
      return await this.auth.sendVerificationEmail(email, redirectUrl);
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      throw error;
    }
  }

  /**
   * Verify an email
   */
  async verifyEmail(userId: string, code: string): Promise<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const response = await this.auth.verifyEmail(userId, code);

      if (response.user) {
        this.userSubject.next(response.user);
      }
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Request a password reset
   */
  async forgotPassword(email: string, redirectUrl?: string): Promise<void> {
    this.errorSubject.next(null);

    try {
      await this.auth.forgotPassword(email, redirectUrl);
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
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
    this.errorSubject.next(null);

    try {
      await this.auth.resetPassword(userId, token, newPassword);
    } catch (error) {
      this.errorSubject.next(error instanceof AuthError ? error : null);
      throw error;
    }
  }
}

/**
 * HTTP interceptor for adding auth tokens to requests
 */
@Injectable()
export class ForgebaseAuthInterceptor implements HttpInterceptor {
  constructor(private authService: ForgebaseAuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Skip if the request is to an external domain
    if (
      !request.url.startsWith('/') &&
      !request.url.includes(window.location.origin)
    ) {
      return next.handle(request);
    }

    // Get the access token
    const accessToken = this.authService.getAccessToken();

    // If we have a token, add it to the request
    if (accessToken) {
      request = this.addTokenToRequest(request, accessToken);
    }

    // Handle the request
    return next.handle(request).pipe(
      catchError((error) => {
        // Check if the error is due to an expired token
        if (
          error.status === 401 &&
          !request.url.includes('/auth/login') &&
          !request.url.includes('/auth/refresh-token')
        ) {
          return this.handle401Error(request, next);
        }

        return throwError(() => error);
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
  constructor(parentModule?: ForgebaseAuthModule) {
    if (parentModule) {
      throw new Error(
        'ForgebaseAuthModule is already loaded. Import it in the AppModule only.'
      );
    }
  }

  /**
   * Configure the ForgebaseAuthModule
   * @param config The ForgebaseWebAuth configuration
   */
  static forRoot(config: ForgebaseWebAuthConfig) {
    return {
      ngModule: ForgebaseAuthModule,
      providers: [
        {
          provide: FORGEBASE_AUTH_CONFIG,
          useValue: config,
        },
      ],
    };
  }
}
