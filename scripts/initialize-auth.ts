import { Knex, knex } from 'knex';
import {
  initializeAuthSchema,
  initializeAdminTables,
} from '../libs/auth/src/config/schema';
import { KnexAdminService } from '../libs/auth/src/services/admin.knex.service';
import { AdminApiKeyService } from '../libs/auth/src/services/admin-api-key.service';
import { KnexConfigStore } from '../libs/auth/src/config/knex-config';

async function initializeAuth(knexInstance: Knex) {
  // Load environment variables
  const {
    ADMIN_EMAIL = 'admin@example.com',
    ADMIN_PASSWORD = 'secure-password',
    ENABLE_ADMIN,
    CREATE_INITIAL_API_KEY = 'true',
    INITIAL_API_KEY_NAME = 'Initial Admin Key',
    INITIAL_API_KEY_SCOPES = '*',
  } = process.env;

  if ((!ADMIN_EMAIL || !ADMIN_PASSWORD) && ENABLE_ADMIN === 'true') {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  if (
    (!INITIAL_API_KEY_NAME || !INITIAL_API_KEY_SCOPES) &&
    CREATE_INITIAL_API_KEY === 'true'
  ) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  try {
    // Initialize auth schema and admin tables
    await initializeAuthSchema(knexInstance);
    await initializeAdminTables(knexInstance);

    // Initialize config store
    const configStore = new KnexConfigStore(knexInstance);
    await configStore.initialize();

    if (ENABLE_ADMIN === 'true') {
      // Initialize services
      const adminService = new KnexAdminService(knexInstance);
      const apiKeyService = new AdminApiKeyService(knexInstance);

      // Check if any admin exists
      const { total } = await adminService.listAdmins(1, 1);

      if (total === 0) {
        // Create initial admin with super admin privileges
        const admin = await adminService.createAdmin(
          {
            email: ADMIN_EMAIL,
            name: 'Initial Admin',
            role: 'super_admin',
            is_super_admin: true,
            permissions: ['*'],
          },
          ADMIN_PASSWORD
        );

        console.log('Created initial admin:', {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        });

        // Create initial API key if configured
        if (CREATE_INITIAL_API_KEY === 'true') {
          try {
            const result = await apiKeyService.createApiKey({
              admin_id: admin.id,
              name: INITIAL_API_KEY_NAME,
              scopes: INITIAL_API_KEY_SCOPES.split(','),
              expires_at: null, // Non-expiring key
            });

            console.log('Created initial admin API key:', {
              id: result.apiKey.id,
              name: result.apiKey.name,
              key_prefix: result.apiKey.key_prefix,
              scopes: result.apiKey.scopes,
            });
            console.log(
              'IMPORTANT: Save this API key, it will only be shown once:',
              result.fullKey
            );
          } catch (error) {
            console.error('Failed to create initial admin API key:', error);
          }
        }
      } else {
        console.log('Initial admin already exists, skipping creation');
      }
    }

    console.log('Auth initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    process.exit(1);
  }
}

// initializeAuth().catch((error) => {
//   console.error('Unhandled error:', error);
//   process.exit(1);
// });
