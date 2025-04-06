import { Knex } from 'knex';
import { DynamicAuthManager, User, KnexUserService, KnexConfigStore, LocalAuthProvider, BasicSessionManager } from '../../index';
import { extendUserTable, UserFieldDefinition } from '../../utils/user-extension';
import { validateUserDataWithZod } from '../../utils/validation';
import { generateTypeInterface } from '../../utils/type-generation';
import { addColumns, migrateData } from '../../utils/migrations';

/**
 * Extended user interface with custom fields
 */
export interface ExtendedUser extends User {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  subscription_tier?: string;
  subscription_expires_at?: Date;
  is_premium?: boolean;
  profile_completed?: boolean;
  login_count?: number;
  last_active_at?: Date;
  preferences?: Record<string, any>;
}

/**
 * Custom field definitions
 */
export const customFields: UserFieldDefinition[] = [
  {
    name: 'first_name',
    type: 'string',
    nullable: true,
    description: 'User\'s first name',
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'last_name',
    type: 'string',
    nullable: true,
    description: 'User\'s last name',
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'display_name',
    type: 'string',
    nullable: true,
    description: 'User\'s display name (defaults to first + last name)',
    validation: {
      maxLength: 200,
    },
  },
  {
    name: 'subscription_tier',
    type: 'string',
    nullable: true,
    default: 'free',
    description: 'User\'s subscription tier',
    validation: {
      pattern: '^(free|basic|premium|enterprise)$',
    },
  },
  {
    name: 'subscription_expires_at',
    type: 'timestamp',
    nullable: true,
    description: 'When the user\'s subscription expires',
  },
  {
    name: 'is_premium',
    type: 'boolean',
    nullable: false,
    default: false,
    description: 'Whether the user has a premium subscription',
  },
  {
    name: 'profile_completed',
    type: 'boolean',
    nullable: false,
    default: false,
    description: 'Whether the user has completed their profile',
  },
  {
    name: 'login_count',
    type: 'integer',
    nullable: false,
    default: 0,
    description: 'Number of times the user has logged in',
  },
  {
    name: 'last_active_at',
    type: 'timestamp',
    nullable: true,
    description: 'When the user was last active',
  },
  {
    name: 'preferences',
    type: 'json',
    nullable: true,
    description: 'User preferences as JSON',
  },
];

/**
 * End-to-end example of extending the user table
 */
export async function e2eExample(knex: Knex): Promise<void> {
  // Step 1: Generate TypeScript interface
  const typeCode = generateTypeInterface({
    interfaceName: 'ExtendedUser',
    fields: customFields,
  });
  
  console.log('Generated TypeScript interface:');
  console.log(typeCode);

  // Step 2: Extend the user table
  console.log('Extending user table...');
  await extendUserTable(knex, {
    fields: customFields,
    migrateExisting: true,
  });
  console.log('User table extended successfully');

  // Step 3: Set up auth manager with extended user type
  console.log('Setting up auth manager...');
  const configStore = new KnexConfigStore(knex);
  await configStore.initialize();
  
  const config = await configStore.getConfig();
  
  const userService = new KnexUserService<ExtendedUser>(config, {
    knex,
    tableName: 'users',
  });
  
  const sessionManager = new BasicSessionManager(config);
  
  const authManager = new DynamicAuthManager<ExtendedUser>(
    configStore,
    {
      local: new LocalAuthProvider<ExtendedUser>(userService),
    },
    sessionManager,
    userService,
    undefined,
    undefined,
    { knex }
  );
  
  // Step 4: Register a user with custom fields
  console.log('Registering user...');
  const userData = {
    email: 'extended.user@example.com',
    password: 'Password123!',
    first_name: 'Extended',
    last_name: 'User',
    subscription_tier: 'basic',
    preferences: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
      },
    },
  };
  
  // Validate user data
  const validationResult = validateUserDataWithZod(userData, customFields);
  if (!validationResult.valid) {
    console.error('Validation errors:', validationResult.errors);
    throw new Error('Invalid user data');
  }
  
  // Register user
  const user = await authManager.register(userData);
  console.log('User registered:', user);
  
  // Step 5: Update user with more custom fields
  console.log('Updating user...');
  await userService.updateUser(user.id, {
    display_name: `${user.first_name} ${user.last_name}`,
    profile_completed: true,
    login_count: 1,
    last_active_at: new Date(),
  });
  
  // Step 6: Retrieve updated user
  const updatedUser = await userService.findUserById(user.id);
  console.log('Updated user:', updatedUser);
  
  // Step 7: Demonstrate a data migration
  console.log('Performing data migration...');
  await migrateData(knex, {
    transform: (user) => {
      // Example: Set is_premium based on subscription_tier
      const isPremium = ['premium', 'enterprise'].includes(user.subscription_tier);
      
      return {
        ...user,
        is_premium: isPremium,
      };
    },
  });
  
  // Step 8: Query users with custom fields
  console.log('Querying users with custom fields...');
  const premiumUsers = await knex('users')
    .where('is_premium', true)
    .count('* as count')
    .first();
    
  console.log(`Number of premium users: ${premiumUsers?.count || 0}`);
  
  const activeUsers = await knex('users')
    .where('last_active_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
    .count('* as count')
    .first();
    
  console.log(`Number of active users in the last 30 days: ${activeUsers?.count || 0}`);
  
  // Step 9: Login with extended user
  console.log('Logging in user...');
  const loginResult = await authManager.login({
    email: userData.email,
    password: userData.password,
  });
  
  console.log('Login successful:', loginResult);
  
  // Step 10: Update login count
  console.log('Updating login count...');
  await knex('users')
    .where('id', user.id)
    .increment('login_count', 1)
    .update({
      last_active_at: knex.fn.now(),
    });
    
  const finalUser = await userService.findUserById(user.id);
  console.log('Final user state:', finalUser);
}

/**
 * Example of using the extended user in an API endpoint
 */
export function apiEndpointExample(req: any, res: any) {
  // This is a mock example of how you might use the extended user in an API
  const user = req.user as ExtendedUser;
  
  // Check if user is premium
  if (!user.is_premium) {
    return res.status(403).json({
      error: 'This endpoint requires a premium subscription',
    });
  }
  
  // Use custom fields in business logic
  const greeting = user.display_name || user.name || user.email;
  
  // Apply user preferences
  const theme = user.preferences?.theme || 'light';
  
  return res.json({
    message: `Hello, ${greeting}!`,
    subscription: {
      tier: user.subscription_tier,
      expires: user.subscription_expires_at,
    },
    preferences: {
      theme,
      ...user.preferences,
    },
    stats: {
      loginCount: user.login_count,
      lastActive: user.last_active_at,
    },
  });
}
