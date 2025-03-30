import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, of, BehaviorSubject } from 'rxjs';

/**
 * Interface for admin user
 */
export interface Admin {
  id: string;
  email: string;
  name?: string;
  role: string;
  permissions?: string[];
  is_super_admin?: boolean;
}

/**
 * Authentication service for managing admin sessions
 * Handles client-side authentication flows and state management
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Reactive authentication state using signals
  private readonly adminUser = signal<Admin | null>(null);
  readonly isAuthenticated = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);

  private readonly baseUrl = 'http://localhost:8000/api/admin';

  /**
   * Initialize the auth service and check authentication state
   */
  constructor() {
    this.checkAuthStatus();
  }

  /**
   * Get the currently authenticated admin
   * @returns Admin user object or null if not authenticated
   */
  getAdmin(): Admin | null {
    return this.adminUser();
  }

  /**
   * Login with email and password
   * @param email Admin email
   * @param password Admin password
   * @returns Observable of the authentication result
   */
  login(email: string, password: string): Observable<boolean> {
    this.isLoading.set(true);

    return this.http
      .post<{ admin: Admin; token?: string }>(
        `${this.baseUrl}/login`,
        { email, password },
        { withCredentials: true } // Critical for cookie-based auth
      )
      .pipe(
        tap((response) => {
          this.adminUser.set(response.admin);
          this.isAuthenticated.set(true);
          this.isLoading.set(false);
        }),
        map(() => true),
        catchError((error) => {
          console.error('Login failed', error);
          this.isLoading.set(false);
          return of(false);
        })
      );
  }

  /**
   * Check if user is currently authenticated
   * @returns Observable of authentication state
   */
  checkAuthStatus(): Observable<boolean> {
    this.isLoading.set(true);
    console.log('Checking auth status');
    return this.http
      .get<{ admin: Admin }>(`${this.baseUrl}/me`, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.adminUser.set(response.admin);
          this.isAuthenticated.set(true);
        }),
        map(() => true),
        catchError(() => {
          console.log('Not authenticated');
          this.adminUser.set(null);
          this.isAuthenticated.set(false);
          return of(false);
        }),
        tap(() => this.isLoading.set(false))
      );
  }

  /**
   * Logout the current user
   * @returns Observable of logout operation
   */
  logout(): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(
        `${this.baseUrl}/logout`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap(() => {
          this.adminUser.set(null);
          this.isAuthenticated.set(false);
          this.router.navigateByUrl('/signin');
        }),
        map(() => true),
        catchError(() => {
          // Still clear local state even if server logout fails
          this.adminUser.set(null);
          this.isAuthenticated.set(false);
          return of(false);
        })
      );
  }
}
