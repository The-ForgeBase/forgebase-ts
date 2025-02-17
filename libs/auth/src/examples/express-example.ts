import express, { Request, Response, NextFunction } from 'express';
import { knex } from 'knex';
import { DynamicAuthManager } from '../authManager';
import { ExpressAuthAdapter } from '../adapters/express';
import { LocalAuthProvider } from '../providers/local';
import { PasswordlessProvider } from '../providers/passwordless';
import { GoogleOAuthProvider } from '../providers/oauth/google';
import { KnexConfigStore } from '../config/knex-config';
import { KnexUserService } from '../userService';
import { User } from '../types';
import { BasicSessionManager } from '../session/session';
import { initializeAuthSchema } from '../config';
import { AuthService } from '../lib/service';
import { providerRegistry } from '../providers/registry';
import { storageRegistry } from '../session/registry';
import { InMemorySessionStorage } from '../session/memory';
import { TokenManager } from '../lib/token-manager';
import { AuditLogger, InMemoryAuditLogStorage } from '../lib/audit-logger';
import { DynamicRuleEngine } from '../lib/rule-engine';
import { PolicyManager } from '../lib/policy-manager';
import { WorkflowEngine, commonStepHandlers } from '../lib/workflow-engine';
import { TenantManager } from '../lib/tenant-manager';
import { HealthMonitor } from '../lib/health';
import { authEvents } from '../lib/events';
import cookieParser from 'cookie-parser';
import session from 'express-session';

interface AppUser extends User {
  name?: string;
  picture?: string;
}

async function setupAuth() {
  // Initialize Knex instance
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  });

  // Create all table schemas
  await initializeAuthSchema(db);

  // Initialize config store
  const configStore = new KnexConfigStore(db);
  await configStore.initialize();

  // Initialize auth config
  const config = await configStore.getConfig();

  // Initialize user service
  const userService = new KnexUserService<AppUser>(config, {
    knex: db,
    tableName: 'users',
  });

  // Initialize auth providers
  const providers = {
    local: new LocalAuthProvider(userService, config),
    passwordless: new PasswordlessProvider({
      tokenStore: db,
      userService,
      sendToken: async (email: string, token: string) => {
        console.log(`Sending token to ${email}: ${token}`);
        // Implement your email sending logic here
      },
    }),
    google: new GoogleOAuthProvider({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'http://localhost:3000/auth/oauth/callback',
      scopes: ['email', 'profile'],
      userService,
      knex: db,
      name: 'google',
    }),
  };

  // Update config to enable providers
  await configStore.updateConfig({
    enabledProviders: ['local', 'passwordless', 'google'],
    // oauthProviders: {
    //   google: {
    //     clientId: process.env.GOOGLE_CLIENT_ID || '',
    //     clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    //     enabled: true,
    //     scopes: ['email', 'profile'],
    //     provider: 'google',
    //   },
    // },
  });

  // Initialize session manager (implement your own or use a library)
  const sessionManager = new BasicSessionManager('my-secret-key', config, db);

  // Initialize auth manager
  const authManager = new DynamicAuthManager(
    configStore,
    providers,
    sessionManager,
    userService,
    5000,
    true,
    { knex: db }
  );

  // Initialize Express app
  const app = express();
  app.use(express.json());

  // Initialize Express auth adapter
  const authAdapter = new ExpressAuthAdapter(authManager);

  // Setup auth routes
  authAdapter.setupRoutes(app);

  // Protected route example
  app.get(
    '/protected',
    async (req, res, next) => {
      await authAdapter.authenticate(req, res, next);
    },
    (req, res) => {
      res.json({ message: 'This is a protected route', user: req['user'] });
    }
  );

  // Start server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Run the example
setupAuth().catch(console.error);

export async function setupExpressAuth() {
  // 1. Create Express app
  const app = express();

  // Setup middleware
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === 'production' },
    })
  );

  // 2. Set up core services
  const sessionStorage = new InMemorySessionStorage();
  storageRegistry.registerStorage('memory', async () => sessionStorage);

  const auditLogger = new AuditLogger(new InMemoryAuditLogStorage());
  const tokenManager = new TokenManager();
  const ruleEngine = new DynamicRuleEngine();
  const policyManager = new PolicyManager();
  const workflowEngine = new WorkflowEngine();
  const tenantManager = new TenantManager();

  // 3. Register and configure providers
  const googleProvider = new GoogleOAuthProvider({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: 'http://localhost:3000/auth/google/callback',
    scopes: ['email', 'profile'],
  });

  providerRegistry.registerProvider('google', () => googleProvider);

  // 4. Configure authentication workflow
  workflowEngine.registerWorkflow({
    id: 'standard-login',
    name: 'Standard Login Flow',
    initialStep: 'auth',
    steps: {
      auth: {
        id: 'auth',
        type: 'oauth',
        required: true,
        next: { success: 'mfa', failure: 'error' },
      },
      mfa: {
        id: 'mfa',
        type: 'mfa:totp',
        required: false,
        next: { verified: 'success', failure: 'error' },
      },
      success: {
        id: 'success',
        type: 'complete',
      },
      error: {
        id: 'error',
        type: 'error',
      },
    },
  });

  // Register workflow step handlers
  Object.entries(commonStepHandlers).forEach(([type, handler]) => {
    workflowEngine.registerStepHandler(type, handler);
  });

  // 5. Configure auth service
  const authConfig = {
    providers: {
      google: {
        enabled: true,
        config: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackUrl: 'http://localhost:3000/auth/google/callback',
        },
      },
    },
    session: {
      storage: 'memory',
      ttl: 86400,
      updateAge: 3600,
    },
    tenant: {
      enabled: true,
      defaultTenant: 'default',
    },
  };

  const authService = new AuthService(authConfig);
  const authAdapter = new ExpressAuthAdapter(authService);

  // 6. Set up event listeners
  authEvents.on('auth:user:authenticated', async ({ userId, provider }) => {
    await auditLogger.log({
      eventType: 'auth:login',
      userId,
      action: 'login',
      status: 'success',
      metadata: { provider },
    });

    await tokenManager.storeToken(userId, {
      type: 'access',
      value: await tokenManager.generateToken(userId),
      expiresAt: Date.now() + 3600 * 1000,
    });
  });

  // 7. Set up policies
  await policyManager.addPolicy({
    id: 'basic-access',
    name: 'Basic Access Policy',
    statements: [
      {
        effect: 'allow',
        actions: ['read:profile', 'update:profile'],
        resources: ['user-profile/*'],
        conditions: {
          'user.verified': true,
        },
      },
    ],
  });

  // 8. Set up auth routes
  const authRouter = express.Router();

  // OAuth routes
  authRouter.get(
    '/google',
    (req, res, next) => {
      const workflow = workflowEngine.startWorkflow('standard-login', {
        provider: 'google',
      });
      req.session.workflowId = workflow.id;
      next();
    },
    authAdapter.authenticate('google')
  );

  authRouter.get(
    '/google/callback',
    authAdapter.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
      const workflowId = req.session.workflowId;
      if (workflowId) {
        await workflowEngine.completeStep(workflowId, 'auth', {
          success: true,
        });
        delete req.session.workflowId;
      }
      res.redirect('/dashboard');
    }
  );

  // MFA routes
  authRouter.post('/mfa/verify', authAdapter.requireAuth, async (req, res) => {
    const { code } = req.body;
    const { workflowId } = req.session;

    if (!workflowId) {
      return res.status(400).json({ error: 'No active workflow' });
    }

    try {
      await workflowEngine.completeStep(workflowId, 'mfa', { code });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Protected routes
  const apiRouter = express.Router();

  // Middleware to check policies
  const checkPolicy = (
    action: string,
    getResourceId: (req: Request) => string
  ) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      const resourceId = getResourceId(req);

      const hasAccess = await policyManager.checkPermission(
        user.id,
        action,
        resourceId
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    };
  };

  // Profile routes with policy checks
  apiRouter.get(
    '/profile',
    authAdapter.requireAuth,
    checkPolicy('read:profile', (req) => `user-profile/${req.user.id}`),
    (req, res) => {
      res.json({ profile: req.user });
    }
  );

  apiRouter.put(
    '/profile',
    authAdapter.requireAuth,
    checkPolicy('update:profile', (req) => `user-profile/${req.user.id}`),
    async (req, res) => {
      // Profile update logic here
      res.json({ success: true });
    }
  );

  // Admin routes
  apiRouter.get(
    '/audit-logs',
    authAdapter.requireAuth,
    authAdapter.requireRoles(['admin']),
    async (req, res) => {
      const logs = await auditLogger.query({
        startTime: Date.now() - 24 * 60 * 60 * 1000,
        limit: 100,
      });
      res.json({ logs });
    }
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    const status = healthMonitor.getStatus();
    res.json(status);
  });

  // Mount routers
  app.use('/auth', authRouter);
  app.use('/api', apiRouter);

  return {
    app,
    authService,
    authAdapter,
    healthMonitor,
    workflowEngine,
    policyManager,
    auditLogger,
  };
}
