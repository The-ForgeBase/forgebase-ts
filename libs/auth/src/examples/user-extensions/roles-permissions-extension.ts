import { Knex } from 'knex';
import {
  extendUserTable,
  UserFieldDefinition,
} from '../../utils/user-extension';

/**
 * Extended user interface with roles and permissions
 */
declare module '../../types' {
  interface UserExtension {
    role?: string;
    permissions?: string[];
    is_admin?: boolean;
    access_level?: number;
    role_assigned_at?: Date;
    role_expires_at?: Date | null;
    restricted_access?: boolean;
    custom_claims?: Record<string, any>;
  }
}

/**
 * Roles and permissions field definitions
 */
export const rolesPermissionsFields: UserFieldDefinition[] = [
  {
    name: 'role',
    type: 'string',
    nullable: true,
    default: 'user',
    description: "User's primary role",
    validation: {
      maxLength: 50,
    },
  },
  {
    name: 'permissions',
    type: 'json',
    nullable: true,
    default: JSON.stringify([]),
    description: 'Array of permission strings',
  },
  {
    name: 'is_admin',
    type: 'boolean',
    nullable: false,
    default: false,
    description: 'Whether the user has admin privileges',
  },
  {
    name: 'access_level',
    type: 'integer',
    nullable: true,
    default: 1,
    description: 'Numeric access level (higher = more access)',
    validation: {
      min: 0,
      max: 100,
    },
  },
  {
    name: 'role_assigned_at',
    type: 'timestamp',
    nullable: true,
    description: 'When the current role was assigned',
  },
  {
    name: 'role_expires_at',
    type: 'timestamp',
    nullable: true,
    description: 'When the current role expires (null = never)',
  },
  {
    name: 'restricted_access',
    type: 'boolean',
    nullable: false,
    default: false,
    description: 'Whether the user has restricted access',
  },
  {
    name: 'custom_claims',
    type: 'json',
    nullable: true,
    description: 'Custom claims for JWT tokens',
  },
];

/**
 * Extends the user table with roles and permissions fields
 * @param knex Knex instance
 * @returns Promise that resolves when the operation is complete
 */
export async function extendUserTableWithRolesPermissions(
  knex: Knex
): Promise<void> {
  await extendUserTable(knex, {
    fields: rolesPermissionsFields,
    migrateExisting: true,
  });
}

/**
 * Example usage of the roles and permissions extension
 */
export async function rolesPermissionsExample(knex: Knex): Promise<void> {
  // 1. Extend the user table with roles and permissions fields
  await extendUserTableWithRolesPermissions(knex);

  // 2. Create a regular user
  const regularUser = await knex('users')
    .insert({
      email: 'regular.user@example.com',
      name: 'Regular User',
      email_verified: true,
      role: 'user',
      permissions: JSON.stringify(['read:own_profile', 'update:own_profile']),
      access_level: 1,
      role_assigned_at: knex.fn.now(),
    })
    .returning('*');

  console.log('Created regular user:', regularUser[0]);

  // 3. Create an admin user
  const adminUser = await knex('users')
    .insert({
      email: 'admin.user@example.com',
      name: 'Admin User',
      email_verified: true,
      role: 'admin',
      is_admin: true,
      permissions: JSON.stringify([
        'read:any_profile',
        'update:any_profile',
        'delete:any_profile',
        'manage:users',
        'manage:settings',
      ]),
      access_level: 10,
      role_assigned_at: knex.fn.now(),
      custom_claims: JSON.stringify({
        admin: true,
        adminSince: new Date().toISOString(),
      }),
    })
    .returning('*');

  console.log('Created admin user:', adminUser[0]);

  // 4. Example of checking permissions
  function hasPermission(user: any, permission: string): boolean {
    const userPermissions = JSON.parse(user.permissions || '[]');
    return userPermissions.includes(permission);
  }

  console.log(
    'Regular user can read own profile:',
    hasPermission(regularUser[0], 'read:own_profile')
  );

  console.log(
    'Regular user can manage users:',
    hasPermission(regularUser[0], 'manage:users')
  );

  console.log(
    'Admin user can manage users:',
    hasPermission(adminUser[0], 'manage:users')
  );

  // 5. Example of role-based access control
  function canAccessAdminPanel(user: any): boolean {
    return user.is_admin || user.role === 'admin' || user.access_level >= 10;
  }

  console.log(
    'Regular user can access admin panel:',
    canAccessAdminPanel(regularUser[0])
  );

  console.log(
    'Admin user can access admin panel:',
    canAccessAdminPanel(adminUser[0])
  );

  // 6. Update user role
  await knex('users')
    .where('id', regularUser[0].id)
    .update({
      role: 'moderator',
      permissions: JSON.stringify([
        'read:own_profile',
        'update:own_profile',
        'read:any_profile',
        'moderate:content',
      ]),
      access_level: 5,
      role_assigned_at: knex.fn.now(),
    });

  const updatedUser = await knex('users')
    .where('id', regularUser[0].id)
    .first();

  console.log('Updated user role:', updatedUser);
}
