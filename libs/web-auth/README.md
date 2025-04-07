# ForgeBase Web Auth SDK

A framework-agnostic web authentication SDK for ForgeBase with SSR support.

## Features

- 🌐 Framework-agnostic - works with any JavaScript framework
- 🖥️ Server-side rendering (SSR) support
- 🔄 Automatic token refresh
- 🍪 Cookie and localStorage support
- 📱 Responsive to different environments
- 🔒 Secure authentication flows
- 🔄 Always fresh user data from the server
- 🧩 Framework-specific integrations (React, Angular, Next.js, Nitro)
- 🔄 Support for both Next.js Pages Router and App Router
- 🚀 Angular integration with signals and standalone components
- 🌐 Nitro framework support (Nuxt, Analog.js, etc.)
- ⚡ TypeScript support

## Installation

```bash
npm install @forgebase/web-auth
# or
yarn add @forgebase/web-auth
```

## Basic Usage

### Standalone Usage

```typescript
import { ForgebaseWebAuth, StorageType } from '@forgebase/web-auth';

// Create a new instance
const auth = new ForgebaseWebAuth({
  apiUrl: 'https://api.example.com',
  storageType: StorageType.COOKIE, // or LOCAL_STORAGE or MEMORY
  useCookies: true, // Use cookies for authentication
  withCredentials: true, // Include credentials in requests
});

// Register a new user
await auth.register({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe',
});

// Login
await auth.login({
  email: 'user@example.com',
  password: 'securePassword123',
});

// Get the current user (from memory)
const user = auth.getCurrentUser(); // Note: This is deprecated

// Get the current user (always fetches fresh data from server)
const user = await auth.getUser();

// Check if authenticated
const isAuthenticated = auth.isAuthenticated();

// Logout
await auth.logout();
```

## React Integration

```tsx
import React from 'react';
import { ForgebaseWebAuth, AuthProvider, useAuth, StorageType } from '@forgebase/web-auth';

// Create auth instance
const auth = new ForgebaseWebAuth({
  apiUrl: 'https://api.example.com',
  storageType: StorageType.COOKIE,
});

// App component
function App() {
  return (
    <AuthProvider auth={auth}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Login component
function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      // Redirect to profile page
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </button>
      {error && <p>{error.message}</p>}
    </form>
  );
}

// Protected route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

## Framework Integrations

### Next.js Integration with SSR

#### Pages Router

```tsx
// _app.tsx
import { AppProps } from 'next/app';
import { ForgebaseWebAuth, AuthProvider, ServerAuthState } from '@forgebase/web-auth';

// Create auth instance
const auth = new ForgebaseWebAuth({
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  storageType: 'cookie',
  cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
});

function MyApp({ Component, pageProps }: AppProps) {
  // Extract auth state from pageProps
  const { user, accessToken, refreshToken, ...restPageProps } = pageProps as ServerAuthState & any;

  return (
    <AuthProvider auth={auth} initialUser={user} initialAccessToken={accessToken} initialRefreshToken={refreshToken}>
      <Component {...restPageProps} />
    </AuthProvider>
  );
}

export default MyApp;

// pages/profile.tsx
import { GetServerSideProps } from 'next';
import { withAuth, useAuth } from '@forgebase/web-auth';

export const getServerSideProps: GetServerSideProps = withAuth(
  {
    authConfig: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      storageType: 'cookie',
    },
    redirectUnauthenticated: '/login',
  },
  async (context, auth, authState) => {
    // You can make authenticated API calls here
    // const api = auth.api;
    // const data = await api.get('/some-protected-endpoint');

    return {
      props: {
        // Additional props
      },
    };
  }
);

function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Profile</h1>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default ProfilePage;
```

### App Router

```tsx
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@forgebase/web-auth';

export function middleware(request: NextRequest) {
  return authMiddleware(request, {
    authConfig: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
      storageType: 'cookie',
      secureCookies: process.env.NODE_ENV === 'production',
    },
    redirectUnauthenticated: '/login',
    publicPaths: ['/login', '/register'],
    authPaths: ['/dashboard', '/profile'],
  });
}

// app/layout.tsx
import { ReactNode } from 'react';
import { getAppRouterAuthProps } from '@forgebase/web-auth';
import ClientAuthProvider from './components/ClientAuthProvider';

export default function RootLayout({ children }: { children: ReactNode }) {
  // Get auth props from server
  const authProps = getAppRouterAuthProps();

  return (
    <html lang="en">
      <body>
        <ClientAuthProvider initialUser={authProps.user} initialAccessToken={authProps.accessToken} initialRefreshToken={authProps.refreshToken}>
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  );
}

// app/components/ClientAuthProvider.tsx
('use client');

import { ReactNode } from 'react';
import { AuthProvider, ForgebaseWebAuth, User } from '@forgebase/web-auth';

// Create auth instance on the client
const auth = new ForgebaseWebAuth({
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  storageType: 'cookie',
});

interface ClientAuthProviderProps {
  children: ReactNode;
  initialUser: User | null;
  initialAccessToken?: string;
  initialRefreshToken?: string;
}

export default function ClientAuthProvider({ children, initialUser, initialAccessToken, initialRefreshToken }: ClientAuthProviderProps) {
  return (
    <AuthProvider auth={auth} initialUser={initialUser} initialAccessToken={initialAccessToken} initialRefreshToken={initialRefreshToken}>
      {children}
    </AuthProvider>
  );
}

// app/dashboard/page.tsx
import { protectRoute, getCurrentUser } from '@forgebase/web-auth';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  // Protect this route - will redirect if not authenticated
  protectRoute();

  // Get the current user from server
  const user = getCurrentUser();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name || 'User'}!</p>

      {/* Pass to client component for interactive features */}
      <DashboardClient initialData={user} />
    </div>
  );
}
```

### Angular Integration

The SDK provides a modern Angular integration with support for signals and standalone components.

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideForgebaseAuth } from '@forgebase/web-auth';
import { StorageType } from '@forgebase/web-auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideForgebaseAuth({
      apiUrl: 'https://api.example.com',
      storageType: StorageType.COOKIE,
      secureCookies: true,
    }),
  ],
};

// login.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForgebaseAuthService } from '@forgebase/web-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div>
      <h1>Login</h1>
      <form (ngSubmit)="onSubmit()">
        <div>
          <label for="email">Email</label>
          <input type="email" id="email" [(ngModel)]="email" name="email" required />
        </div>
        <div>
          <label for="password">Password</label>
          <input type="password" id="password" [(ngModel)]="password" name="password" required />
        </div>
        <button type="submit" [disabled]="isLoading()">{{ isLoading() ? 'Loading...' : 'Login' }}</button>
      </form>
      @if (currentError()) {
      <div class="error">{{ currentError().message }}</div>
      }
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';

  // Inject the auth service
  constructor(private authService: ForgebaseAuthService) {}

  // Access signals directly
  isLoading = this.authService.isLoading;
  currentError = this.authService.currentError;

  async onSubmit() {
    try {
      await this.authService.login({
        email: this.email,
        password: this.password,
      });
      // Navigate to dashboard
    } catch (error) {
      // Error is handled by the service
    }
  }
}

// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ForgebaseAuthService } from '@forgebase/web-auth';

export const authGuard: CanActivateFn = () => {
  const authService = inject(ForgebaseAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login
  return router.parseUrl('/login');
};
```

### Nitro Framework Integration

The SDK provides integration with Nitro-based frameworks like Nuxt and Analog.js.

```typescript
// server/middleware/auth.ts (Nuxt example)
import { defineEventHandler } from 'h3';
import { nitroAuthMiddleware } from '@forgebase/web-auth';

export default defineEventHandler((event) => {
  nitroAuthMiddleware(event, {
    authConfig: {
      apiUrl: process.env.API_URL || '',
      storageType: 'cookie',
      secureCookies: process.env.NODE_ENV === 'production'
    },
    redirectUnauthenticated: '/login',
    publicPaths: ['/login', '/register'],
    authPaths: ['/dashboard', '/profile']
  });
});

// server/api/protected.ts
import { defineEventHandler } from 'h3';
import {
  protectNitroRoute,
  getNitroUser,
  createNitroAuthenticatedFetch
} from '@forgebase/web-auth';

export default defineEventHandler(async (event) => {
  // Protect this route
  protectNitroRoute(event);

  // Get the current user
  const user = getNitroUser(event);

  // Create an authenticated fetch
  const authenticatedFetch = createNitroAuthenticatedFetch(event);

  // Make an authenticated request
  const response = await authenticatedFetch('https://api.example.com/data');
  const data = await response.json();

  return {
    user,
    data
  };
});

// pages/login.vue (Nuxt example)
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const error = ref(null);
const loading = ref(false);
const router = useRouter();

async function login() {
  loading.value = true;
  error.value = null;

  try {
    const response = await $fetch('/api/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    });

    if (response.success) {
      router.push('/dashboard');
    }
  } catch (err) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1>Login</h1>
    <form @submit.prevent="login">
      <div>
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required>
      </div>
      <div>
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit" :disabled="loading">{{ loading ? 'Loading...' : 'Login' }}</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>
```

## Authentication Flows

### Email Verification

```typescript
// Send verification email
const { sendVerificationEmail } = useAuth();
await sendVerificationEmail('user@example.com', 'https://example.com/verify');

// Verify email
const { verifyEmail } = useAuth();
await verifyEmail(userId, verificationCode);
```

### Password Reset

```typescript
// Request password reset
const { forgotPassword } = useAuth();
await forgotPassword('user@example.com', 'https://example.com/reset-password');

// Verify reset token
const { auth } = useAuth();
const isValid = await auth.verifyResetToken(userId, resetToken);

// Reset password
const { resetPassword } = useAuth();
await resetPassword(userId, resetToken, 'newSecurePassword123');
```

## Storage Options

The SDK supports different storage mechanisms:

```typescript
import { ForgebaseWebAuth, StorageType } from '@forgebase/web-auth';

// Use cookies (default)
const auth1 = new ForgebaseWebAuth({
  apiUrl: 'https://api.example.com',
  storageType: StorageType.COOKIE,
  cookieDomain: 'example.com',
  secureCookies: true,
  httpOnlyCookies: true,
  sameSite: 'lax',
});

// Use localStorage
const auth2 = new ForgebaseWebAuth({
  apiUrl: 'https://api.example.com',
  storageType: StorageType.LOCAL_STORAGE,
});

// Use in-memory storage (for SSR or when storage is not available)
const auth3 = new ForgebaseWebAuth({
  apiUrl: 'https://api.example.com',
  storageType: StorageType.MEMORY,
});

// Use custom storage
const auth4 = new ForgebaseWebAuth({
  apiUrl: 'https://api.example.com',
  storage: myCustomStorage, // Implements AuthStorage interface
});
```

## SSR Detection

The SDK automatically detects if it's running in an SSR environment and adjusts its behavior accordingly:

- In SSR environments, it won't try to access browser-specific APIs
- It will use cookies for authentication in SSR environments
- It provides utilities for hydrating the auth state from server to client

## Using the Axios Instance

The SDK exposes the configured axios instance with all authentication interceptors:

```typescript
// Get the axios instance
const { getApi } = useAuth();
const api = getApi();

// Make authenticated API calls
const response = await api.get('/protected-resource');
```

## Error Handling

```typescript
import { AuthErrorType } from '@forgebase/web-auth';

try {
  await auth.login({ email, password });
} catch (error) {
  switch (error.type) {
    case AuthErrorType.INVALID_CREDENTIALS:
      // Handle invalid credentials
      break;
    case AuthErrorType.VERIFICATION_REQUIRED:
      // Handle verification required
      break;
    case AuthErrorType.NETWORK_ERROR:
      // Handle network error
      break;
    case AuthErrorType.SSR_ERROR:
      // Handle SSR-specific error
      break;
    default:
      // Handle other errors
      break;
  }
}
```

## License

MIT
