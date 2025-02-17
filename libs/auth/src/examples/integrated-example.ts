import { AuthService } from '../lib/service';
import { FastifyInstance } from 'fastify';
import { FastifyAuthAdapter } from '../adapters/fastify';
import { providerRegistry } from '../providers/registry';
import { storageRegistry } from '../session/registry';
import { InMemorySessionStorage } from '../session/memory';
import { TokenManager } from '../lib/token-manager';
import { AuditLogger, InMemoryAuditLogStorage } from '../lib/audit-logger';
import { DynamicRuleEngine } from '../lib/rule-engine';
import { PolicyManager } from '../lib/policy-manager';
import { WorkflowEngine, commonStepHandlers } from '../lib/workflow-engine';
import { GoogleOAuthProvider } from '../providers/oauth/google';
import { TenantManager } from '../lib/tenant-manager';
import { HealthMonitor } from '../lib/health';
import { authEvents } from '../lib/events';

export async function setupIntegratedAuth(app: FastifyInstance) {
  // 1. Set up core services
  const sessionStorage = new InMemorySessionStorage();
  storageRegistry.registerStorage('memory', async () => sessionStorage);

  const auditLogger = new AuditLogger(new InMemoryAuditLogStorage());
  const tokenManager = new TokenManager();
  const ruleEngine = new DynamicRuleEngine();
  const policyManager = new PolicyManager();
  const workflowEngine = new WorkflowEngine();
  const tenantManager = new TenantManager();

  // 2. Register and configure providers
  const googleProvider = new GoogleOAuthProvider({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: 'http://localhost:3000/auth/oauth/callback',
    scopes: ['email', 'profile'],
  });

  providerRegistry.registerProvider('google', () => googleProvider);

  // 3. Configure authentication workflow
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

  // 4. Set up health monitoring
  const healthMonitor = new HealthMonitor({ version: '1.0.0' });
  healthMonitor.registerHealthCheck('session', async () => ({
    status: 'healthy',
    details: { provider: 'memory' },
  }));
  healthMonitor.start();

  // 5. Configure initial auth service
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
      expiresAt: Date.now() + 3600 * 1000, // 1 hour
    });
  });

  // 7. Set up basic access policies
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

  // 8. Initialize Fastify auth adapter
  const authAdapter = new FastifyAuthAdapter(authService);

  // 9. Set up auth routes
  app.register(async function (fastify) {
    // Health check endpoint
    fastify.get('/health', async () => healthMonitor.getStatus());

    // Auth endpoints with workflow integration
    fastify.post('/auth/:provider', async (request, reply) => {
      const { provider } = request.params as { provider: string };
      const workflow = await workflowEngine.startWorkflow('standard-login', {
        provider,
      });

      return authAdapter.handleAuth(request, reply, provider, {
        workflowId: workflow.id,
      });
    });

    // Protected route example using policies
    fastify.get(
      '/profile',
      { preHandler: authAdapter.authenticate },
      async (request, reply) => {
        const user = request.user;
        const hasAccess = await policyManager.checkPermission(
          user.id,
          'read:profile',
          `user-profile/${user.id}`
        );

        if (!hasAccess) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        return { profile: user };
      }
    );

    // Audit logs endpoint (admin only)
    fastify.get(
      '/audit-logs',
      {
        preHandler: [
          authAdapter.authenticate,
          authAdapter.requireRoles(['admin']),
        ],
      },
      async (request) => {
        const logs = await auditLogger.query({
          startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
          limit: 100,
        });
        return { logs };
      }
    );
  });

  return {
    authService,
    authAdapter,
    healthMonitor,
    workflowEngine,
    policyManager,
    auditLogger,
  };
}
