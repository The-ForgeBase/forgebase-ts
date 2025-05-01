export * from './nestjs.module';
export * from './services/auth.service';
export * from './controllers/auth.controller';
export * from './guards/auth.guard';

// Export admin components
export * from './services/admin.service';
export * from './controllers/admin.controller';
export * from './controllers/admin-api-key.controller';
export * from './guards/admin.guard';
export * from './middlewares/admin.middleware';
export * from './decorators/public.decorator';
export * from './decorators/require-scopes.decorator';

export type NestAuthConfig = {
  basePath?: string;
  cookieName?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    maxAge?: number;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
  };
  tokenExpiry?: string;
  jwtSecret?: string;
};
