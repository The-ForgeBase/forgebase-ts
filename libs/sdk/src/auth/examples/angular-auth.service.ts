import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { AuthClient } from '../client';
import { StorageFactory } from '../storage';
import type { BaseUser, LoginCredentials, RegisterCredentials } from '../types';

@Injectable({ providedIn: 'root' })
export class AuthService<T extends BaseUser = BaseUser> {
  private platformId = inject(PLATFORM_ID);
  private auth: AuthClient<T>;
  private userSubject = new BehaviorSubject<T | null>(null);

  readonly user = toSignal(this.userSubject.asObservable());

  constructor() {
    // Create auth client with environment-appropriate storage
    this.auth = new AuthClient<T>({
      baseUrl: 'http://localhost:3000', // Replace with your API URL
      storage: StorageFactory.createStorage(
        // Use memory storage for SSR, localStorage for browser
        isPlatformBrowser(this.platformId) ? 'localStorage' : 'memory'
      ),
      // Use httpOnly cookies for better security
      tokens: {
        includeTokenHeader: false, // Let the server handle tokens via cookies
      },
      httpClient: {
        credentials: 'include', // Required for cookies
      },
    });

    // Initialize user state asynchronously
    this.initializeUserState();
  }

  private async initializeUserState() {
    try {
      const currentUser = await this.auth.getCurrentUser();
      this.userSubject.next(currentUser);

      // Set up refresh token interval in browser only
      if (isPlatformBrowser(this.platformId)) {
        setInterval(async () => {
          if (this.auth.isAuthenticated()) {
            try {
              const result = await this.auth.refreshToken();
              if (result.user) {
                this.userSubject.next(result.user);
              }
            } catch (error) {
              console.error('Token refresh failed:', error);
              this.userSubject.next(null);
            }
          }
        }, 14 * 60 * 1000); // Refresh every 14 minutes
      }
    } catch (error) {
      console.error('Failed to initialize user state:', error);
      this.userSubject.next(null);
    }
  }

  async register<R extends Record<string, any>>(
    credentials: RegisterCredentials<R>
  ) {
    const result = await this.auth.register(credentials);
    if (result.user) {
      this.userSubject.next(result.user as T);
    }
    return result;
  }

  async login(credentials: LoginCredentials) {
    const result = await this.auth.login(credentials);
    if (result.user) {
      this.userSubject.next(result.user);
    }
    return result;
  }

  async logout() {
    await this.auth.logout();
    this.userSubject.next(null);
  }

  async verifyEmail(userId: string, code: string) {
    const result = await this.auth.verifyEmail({ userId, code });
    if (result.user) {
      this.userSubject.next(result.user);
    }
    return result;
  }

  async isAuthenticated(): Promise<boolean> {
    return await this.auth.isAuthenticated();
  }
}
