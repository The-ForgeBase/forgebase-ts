# ForgeBase Auth Client

A secure, SSR-compatible authentication client for ForgeBase Auth. Built with TypeScript and designed for modern web applications.

## Features

- 🔐 Secure Authentication

  - Multiple auth providers (Local, OAuth, Passwordless)
  - Token-based auth with refresh capability
  - Email & SMS verification
  <!-- - Multi-factor authentication (MFA) -->
  - OWASP compliant security practices

- 🌐 Framework Support

  <!-- - First-class Angular/AnalogJS support -->

  - SSR compatibility
  - Framework agnostic core
  - Cookie-based and header-based token handling

- 🎨 Modern Development

  - Full TypeScript support
  <!-- - Signals-based state management
  - Zoneless change detection support -->
  - Zero dependencies

<!-- - 🔄 State Management
  - Reactive auth state
  - Automatic token refresh
  - Persistent session handling
  - Memory-safe storage adapters -->

## Installation

```bash
# Using npm
npm install @forgebase/sdk

# Using pnpm (recommended)
pnpm add @forgebase/sdk

# Using yarn
yarn add @forgebase/sdk
```

## Usage

### Basic Setup (Angular/AnalogJS)

```typescript
import { provideHttpClient, withCredentials } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { AuthClient, StorageFactory } from '@forgebase/sdk/auth';

// Configure auth in app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withCredentials()),
    {
      provide: AuthClient,
      useFactory: () => new AuthClient({
        baseUrl: 'https://api.yourdomain.com',
        // Use httpOnly cookies (recommended for production)
        tokens: {
          includeTokenHeader: false
        },
        httpClient: {
          credentials: 'include'
        }
      })
    }
  ]
};

// Create auth service (auth.service.ts)
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthClient, StorageFactory, BaseUser } from '@forgebase/sdk/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';

interface CustomUser extends BaseUser {
  roles: string[];
  preferences?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private auth: AuthClient<CustomUser>;
  private userSubject = new BehaviorSubject<CustomUser | null>(null);

  readonly user = toSignal(this.userSubject.asObservable());

  constructor() {
    // Initialize with environment-appropriate storage
    this.auth = new AuthClient<CustomUser>({
      baseUrl: 'https://api.yourdomain.com',
      storage: StorageFactory.createStorage(
        isPlatformBrowser(this.platformId) ? 'localStorage' : 'memory'
      ),
      // Use secure HttpOnly cookies in production
      tokens: {
        includeTokenHeader: false
      },
      httpClient: {
        credentials: 'include'
      }
    });

    // Initialize auth state
    if (isPlatformBrowser(this.platformId)) {
      this.initializeAuth();
    }
  }

  private async initializeAuth() {
    try {
      // Validate and load current user
      if (await this.auth.isAuthenticated({ validateWithServer: true })) {
        const user = await this.auth.getCurrentUser({ forceFetch: true });
        this.userSubject.next(user);
      }

      // Set up token refresh (if using header-based auth)
      this.setupTokenRefresh();
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.userSubject.next(null);
    }
  }

  private setupTokenRefresh() {
    if (!isPlatformBrowser(this.platformId)) return;

    setInterval(async () => {
      try {
        if (await this.auth.isAuthenticated()) {
          const result = await this.auth.refreshToken();
          if (result.user) {
            this.userSubject.next(result.user);
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.userSubject.next(null);
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes
  }

  async login(email: string, password: string) {
    const result = await this.auth.login({ email, password });
    if (result.user) {
      this.userSubject.next(result.user);
    }
    return result;
  }

  async register(credentials: RegisterCredentials) {
    const result = await this.auth.register(credentials);
    if (result.user) {
      this.userSubject.next(result.user);
    }
    return result;
  }

  async logout() {
    await this.auth.logout();
    this.userSubject.next(null);
  }
}

// Use in components
@Component({
  selector: 'app-auth-status',
  standalone: true,
  template: \`
    @if (authService.user()) {
      <span>Welcome, {{ authService.user()?.name }}</span>
      <button (click)="authService.logout()">Logout</button>
    } @else {
      <button (click)="login()">Login</button>
    }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthStatusComponent {
  constructor(public authService: AuthService) {}
}
```

### Security Best Practices

1. **Cookie Security (Recommended for Production)**

```typescript
const auth = new AuthClient({
  baseUrl: 'https://api.yourdomain.com',
  // Disable token headers to rely on HttpOnly cookies
  tokens: {
    includeTokenHeader: false,
  },
  httpClient: {
    credentials: 'include',
  },
});
```

2. **Header-Based Auth (Development/Testing)**

```typescript
const auth = new AuthClient({
  baseUrl: 'https://api.yourdomain.com',
  tokens: {
    includeTokenHeader: true,
    headers: {
      authorization: 'Authorization',
      refreshToken: 'RToken',
    },
  },
});
```

3. **SSR Security**

```typescript
// Always use memory storage in SSR context
const auth = new AuthClient({
  baseUrl: 'https://api.yourdomain.com',
  storage: StorageFactory.createStorage('memory'),
  // Memory storage always uses headers
  tokens: {
    includeTokenHeader: true,
  },
});
```

4. **Input Validation**

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function secureLogin(credentials: unknown) {
  const validated = loginSchema.parse(credentials);
  return auth.login(validated);
}
```

### Advanced Configuration

```typescript
interface CustomUser extends BaseUser {
  roles: string[];
  organizations: string[];
}

const auth = new AuthClient<CustomUser>({
  baseUrl: 'https://api.yourdomain.com',
  paths: {
    login: '/auth/custom-login',
    register: '/auth/custom-register',
    refresh: '/auth/custom-refresh',
    verifyEmail: '/auth/custom-verify-email',
    logout: '/auth/custom-logout',
  },
  storage: StorageFactory.createStorage('localStorage'),
  httpClient: {
    headers: {
      'X-Custom-Header': 'value',
    },
    credentials: 'include',
  },
  tokens: {
    includeTokenHeader: true,
    headers: {
      authorization: 'X-Custom-Auth',
      refreshToken: 'X-Custom-Refresh',
    },
  },
});
```

### Error Handling

```typescript
try {
  const result = await auth.login({
    email: 'user@example.com',
    password: 'password123',
  });

  if (result.error) {
    // Handle specific error cases
    switch (result.error) {
      case 'invalid_credentials':
        showError('Invalid email or password');
        break;
      case 'email_not_verified':
        showError('Please verify your email first');
        break;
      case 'mfa_required':
        redirectToMfa();
        break;
      default:
        showError('An error occurred');
    }
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Authentication error:', error);
  showError('An unexpected error occurred');
}
```

## Storage Adapters

The auth client supports multiple storage strategies:

```typescript
// Browser storage (localStorage/sessionStorage)
const browserStorage = StorageFactory.createStorage('localStorage');

// Memory storage (for SSR)
const memoryStorage = StorageFactory.createStorage('memory');

// Custom storage adapter
class CustomStorage implements StorageAdapter {
  private store = new Map<string, string>();

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
```

## API Reference

### AuthClient

#### Methods

- `register<T>(credentials: RegisterCredentials<T>): Promise<AuthResponse>`
- `login(credentials: LoginCredentials): Promise<AuthResponse>`
- `logout(): Promise<void>`
- `getCurrentUser(options?: { forceFetch?: boolean }): Promise<User | null>`
- `isAuthenticated(options?: { validateWithServer?: boolean }): Promise<boolean>`
- `refreshToken(): Promise<AuthResponse>`
- `verifyEmail(payload: EmailVerificationPayload): Promise<AuthResponse>`

#### Types

```typescript
interface BaseUser {
  id: string;
  email: string;
  name?: string;
  email_verified?: boolean;
  phone?: string;
  phone_verified?: boolean;
  picture?: string;
  mfa_enabled?: boolean;
}

interface AuthResponse<T extends BaseUser = BaseUser> {
  user?: T;
  token?: AuthToken | string;
  message?: string;
  error?: string;
}

interface AuthToken {
  accessToken: string;
  refreshToken: string;
}
```

## Contributing

Please read our [Contributing Guide](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Security

For security issues, please email security@forgebase.dev instead of using the issue tracker.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
