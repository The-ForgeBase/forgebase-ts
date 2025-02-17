import { AuthService } from '../lib/service';
import { providerRegistry } from '../providers/registry';
import { storageRegistry } from '../session/registry';
import { InMemorySessionStorage } from '../session/memory';
import { InMemoryAuditLogStorage } from '../lib/audit-logger';
import { AuditLogger } from '../lib/audit-logger';
import { HealthMonitor, commonHealthChecks } from '../lib/health';
import { authEvents } from '../lib/events';
import { hookManager } from '../lib/hooks';
import { TokenManager } from '../lib/token-manager';
import { GoogleOAuthProvider } from '../providers/oauth';
import { DynamicRuleEngine } from '../lib/rule-engine';
import { ConfigSynchronizer, InMemorySyncAdapter } from '../lib/sync';
import { TenantManager } from '../lib/tenant-manager';
import { PolicyManager } from '../lib/policy-manager';
import { WorkflowEngine, commonStepHandlers } from '../lib/workflow-engine';

// 1. Set up session storage
const sessionStorage = new InMemorySessionStorage();
storageRegistry.registerStorage('memory', async () => sessionStorage);

// 2. Set up the auth providers
const googleProvider = new GoogleOAuthProvider();
providerRegistry.registerProvider('google', GoogleOAuthProvider);

// 3. Initialize core services
const auditLogger = new AuditLogger(new InMemoryAuditLogStorage());
const tokenManager = new TokenManager();
const ruleEngine = new DynamicRuleEngine();
const policyManager = new PolicyManager();
const workflowEngine = new WorkflowEngine();
const tenantManager = new TenantManager();

// 4. Configure sync for multi-instance deployments
const configSync = new ConfigSynchronizer();
configSync.setAdapter(new InMemorySyncAdapter());

// 5. Set up health monitoring
const healthMonitor = new HealthMonitor({ version: '1.0.0' });
healthMonitor.registerHealthCheck('memory', commonHealthChecks.memory);
healthMonitor.registerHealthCheck(
  'providers',
  commonHealthChecks.providers(providerRegistry)
);
healthMonitor.start();

// 6. Register authentication workflow
workflowEngine.registerWorkflow({
  id: 'standard-login',
  name: 'Standard Login Flow',
  initialStep: 'auth',
  steps: {
    auth: {
      id: 'auth',
      type: 'oauth',
      config: {},
      required: true,
      next: { success: 'mfa', failure: 'error' },
    },
    mfa: {
      id: 'mfa',
      type: 'mfa:totp',
      config: {},
      required: true,
      next: { verified: 'success', failure: 'error' },
    },
    success: {
      id: 'success',
      type: 'complete',
      config: {},
      required: true,
    },
    error: {
      id: 'error',
      type: 'error',
      config: {},
      required: true,
    },
  },
});

// Register workflow step handlers
Object.entries(commonStepHandlers).forEach(([type, handler]) => {
  workflowEngine.registerStepHandler(type, handler);
});

// 7. Set up hooks
hookManager.addHook('pre:authenticate', async (context) => {
  await auditLogger.log({
    eventType: 'auth:attempt',
    resourceType: 'authentication',
    resourceId: context.sessionId || 'unknown',
    action: 'login',
    status: 'pending',
  });
});

hookManager.addHook('post:authenticate', async (context) => {
  await auditLogger.log({
    eventType: 'auth:complete',
    resourceType: 'authentication',
    resourceId: context.sessionId || 'unknown',
    action: 'login',
    status: 'success',
    userId: context.userId,
  });
});

// 8. Configure auth service
const initialConfig = {
  providers: {
    google: {
      enabled: true,
      config: {
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        callbackUrl: 'http://localhost:3000/auth/callback',
        scope: ['email', 'profile'],
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
      },
    },
  },
  session: {
    storage: 'memory',
    ttl: 86400,
    updateAge: 3600,
  },
};

const authService = new AuthService(initialConfig);

// 9. Set up event listeners
authEvents.on('auth:user:authenticated', async (data) => {
  await tokenManager.storeToken(data.userId, {
    type: 'access',
    value: 'generated-token',
    expiresAt: Date.now() + 3600000,
  });
});

// 10. Example usage
async function example() {
  try {
    // Authenticate user
    const authResult = await authService.authenticate('google', {
      code: 'oauth-code-from-callback',
    });

    // Create session
    await storageRegistry.getActiveStorage().set(
      'session-id',
      {
        userId: authResult.id,
        provider: 'google',
        profile: authResult,
      },
      86400
    );

    // Check permissions
    await policyManager.addPolicy({
      id: 'basic-access',
      name: 'Basic Access',
      statements: [
        {
          effect: 'allow',
          actions: ['read'],
          resources: ['profile/*'],
        },
      ],
    });

    await policyManager.attachPolicyToUser(authResult.id, 'basic-access');
    const canAccess = await policyManager.checkPermission(
      authResult.id,
      'read',
      'profile/settings'
    );

    console.log('Authentication successful:', authResult);
    console.log('Has profile access:', canAccess);

    // Get health status
    const healthStatus = healthMonitor.getStatus();
    console.log('System health:', healthStatus);

    // Get audit logs
    const auditLogs = await auditLogger.query({
      startTime: Date.now() - 86400000,
      userId: authResult.id,
    });
    console.log('Recent audit logs:', auditLogs);
  } catch (error) {
    console.error('Authentication error:', error);
  }
}

export { example, authService, healthMonitor, auditLogger };
