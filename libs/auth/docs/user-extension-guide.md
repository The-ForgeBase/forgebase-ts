# User Extension Guide

## Overview

This guide explains how to extend the ForgeBase Auth user table with custom fields. It covers best practices, implementation strategies, and provides examples for common use cases.

## Table of Contents

1. [When to Extend the User Table](#when-to-extend-the-user-table)
2. [Extension Methods](#extension-methods)
3. [TypeScript Integration](#typescript-integration)
4. [Validation](#validation)
5. [Migration Strategies](#migration-strategies)
6. [Security Considerations](#security-considerations)
7. [Performance Considerations](#performance-considerations)
8. [Common Extension Patterns](#common-extension-patterns)
9. [Examples](#examples)

## When to Extend the User Table

### Extend the User Table When:

- You need to store simple user attributes that are frequently accessed with the user
- The data is directly related to user identity or authentication
- The data is used for authorization decisions
- You need to query or filter users based on these attributes
- The data has a one-to-one relationship with users

### Create Related Tables When:

- The data has a one-to-many or many-to-many relationship with users
- The data is complex or large (e.g., large JSON objects, long text fields)
- The data is accessed independently of the user
- The data has its own lifecycle or versioning
- You need to maintain history or audit trails for the data

## Extension Methods

ForgeBase Auth provides several methods for extending the user table:

### 1. Using the Extension Utilities

```typescript
import { extendUserTable } from '@forgebase-ts/auth/utils/user-extension';
import { Knex } from 'knex';

// Define your custom fields
const customFields = [
  {
    name: 'company_name',
    type: 'string',
    nullable: true,
    description: 'User\'s company name',
  },
  {
    name: 'subscription_tier',
    type: 'string',
    nullable: false,
    default: 'free',
    description: 'User\'s subscription tier',
  },
];

// Extend the user table
async function setupCustomFields(knex: Knex) {
  await extendUserTable(knex, {
    fields: customFields,
    migrateExisting: true,
  });
}
```

### 2. Using Migration Helpers

```typescript
import { addColumns } from '@forgebase-ts/auth/utils/migrations';
import { Knex } from 'knex';

// Define your custom fields
const customFields = [
  {
    name: 'company_name',
    type: 'string',
    nullable: true,
  },
  {
    name: 'subscription_tier',
    type: 'string',
    nullable: false,
    default: 'free',
  },
];

// Add columns in a migration
export async function up(knex: Knex) {
  await addColumns(knex, {
    fields: customFields,
    tableName: 'users',
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('company_name');
    table.dropColumn('subscription_tier');
  });
}
```

### 3. Direct Schema Modification

```typescript
import { Knex } from 'knex';

export async function extendUserTableManually(knex: Knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('company_name').nullable();
    table.string('subscription_tier').notNullable().defaultTo('free');
  });
}
```

## TypeScript Integration

### 1. Extending the User Type

```typescript
import { User } from '@forgebase-ts/auth';

// Define your extended user interface
export interface CustomUser extends User {
  company_name?: string;
  subscription_tier: string;
  preferences?: Record<string, any>;
}

// Use the extended type with auth services
import { KnexUserService } from '@forgebase-ts/auth';

const userService = new KnexUserService<CustomUser>(config, internalConfig);
```

### 2. Generating Types from Field Definitions

```typescript
import { generateUserTypeInterface } from '@forgebase-ts/auth/utils/user-extension';

// Define your fields
const customFields = [
  {
    name: 'company_name',
    type: 'string',
    nullable: true,
  },
  {
    name: 'subscription_tier',
    type: 'string',
    nullable: false,
    default: 'free',
  },
];

// Generate TypeScript interface
const interfaceCode = generateUserTypeInterface('CustomUser', customFields);
console.log(interfaceCode);
// Output:
// import { User } from '@forgebase-ts/auth';
//
// /**
//  * Extended user interface with custom fields
//  */
// export interface CustomUser extends User {
//   company_name?: string;
//   subscription_tier: string;
// }
```

## Validation

ForgeBase Auth provides validation utilities for custom user fields:

```typescript
import { validateUserData } from '@forgebase-ts/auth/utils/user-extension';
import { validateUserDataWithZod } from '@forgebase-ts/auth/utils/validation';

// Define fields with validation rules
const fields = [
  {
    name: 'email',
    type: 'string',
    nullable: false,
    validation: {
      required: true,
      isEmail: true,
    },
  },
  {
    name: 'age',
    type: 'integer',
    nullable: true,
    validation: {
      min: 18,
      max: 120,
    },
  },
];

// Validate user data
const userData = {
  email: 'invalid-email',
  age: 15,
};

const result = validateUserData(userData, fields);
console.log(result.valid); // false
console.log(result.errors); // { email: 'email must be a valid email address', age: 'age must be at least 18' }

// Or use Zod-based validation
const zodResult = validateUserDataWithZod(userData, fields);
```

## Migration Strategies

### Adding New Fields

```typescript
import { addColumns } from '@forgebase-ts/auth/utils/migrations';

// Add new fields
await addColumns(knex, {
  fields: [
    {
      name: 'new_field',
      type: 'string',
      nullable: true,
    },
  ],
});
```

### Renaming Fields

```typescript
import { renameColumn } from '@forgebase-ts/auth/utils/migrations';

// Rename a field
await renameColumn(knex, {
  oldName: 'old_field_name',
  newName: 'new_field_name',
});
```

### Modifying Fields

```typescript
import { modifyColumn } from '@forgebase-ts/auth/utils/migrations';

// Modify a field
await modifyColumn(knex, {
  field: {
    name: 'existing_field',
    type: 'string',
    nullable: false,
    default: 'new default',
  },
});
```

### Data Migration

```typescript
import { migrateData } from '@forgebase-ts/auth/utils/migrations';

// Transform existing data
await migrateData(knex, {
  transform: (user) => {
    // Transform user data
    return {
      ...user,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    };
  },
  batchSize: 100, // Process in batches of 100
});
```

## Security Considerations

1. **Sensitive Data**: Avoid storing sensitive information in the user table. Use encryption or separate secure storage for sensitive data.

2. **Data Sanitization**: Always sanitize user data before returning it to clients:

```typescript
import { sanitizeUser } from '@forgebase-ts/auth';

// Add your custom sensitive fields to the sanitization list
const SENSITIVE_USER_FIELDS = [
  'password_hash',
  'mfa_secret',
  'tax_id',
  // Add your custom sensitive fields here
];

// Sanitize user data
const sanitizedUser = sanitizeUser(user);
```

3. **Input Validation**: Always validate user input before storing it:

```typescript
import { validateUserData } from '@forgebase-ts/auth/utils/user-extension';

// Validate before updating
const validationResult = validateUserData(userData, fieldDefinitions);
if (!validationResult.valid) {
  throw new Error('Invalid user data');
}
```

4. **Access Control**: Implement proper access controls for custom fields:

```typescript
// Example of field-level access control
function canViewField(user, targetUser, fieldName) {
  // Self can view all their own fields
  if (user.id === targetUser.id) return true;
  
  // Admins can view all fields
  if (user.is_admin) return true;
  
  // Field-specific rules
  const sensitiveFields = ['tax_id', 'business_address'];
  if (sensitiveFields.includes(fieldName)) {
    return false;
  }
  
  return true;
}
```

## Performance Considerations

1. **Indexing**: Add indexes for fields that will be frequently queried:

```typescript
await knex.schema.alterTable('users', (table) => {
  table.index('role');
  table.index('company_name');
});
```

2. **JSON Fields**: Be cautious with JSON fields as they can impact performance:

```typescript
// Instead of querying inside JSON
// Avoid: WHERE json_field->>'property' = 'value'

// Consider extracting frequently queried properties to separate columns
await knex.schema.alterTable('users', (table) => {
  table.string('primary_role').nullable();
  // Extract from JSON: UPDATE users SET primary_role = permissions->>'role'
});
```

3. **Denormalization**: Consider denormalizing related data for performance:

```typescript
// Instead of joining with another table for every user query
// Store frequently accessed related data directly in the user table
await knex.schema.alterTable('users', (table) => {
  table.string('organization_name').nullable();
  table.string('subscription_plan_name').nullable();
});
```

## Common Extension Patterns

### 1. Profile Data

See [Profile Extension Example](../src/examples/user-extensions/profile-extension.ts)

### 2. User Preferences

See [Preferences Extension Example](../src/examples/user-extensions/preferences-extension.ts)

### 3. Business Information

See [Business Extension Example](../src/examples/user-extensions/business-extension.ts)

### 4. Roles and Permissions

See [Roles and Permissions Example](../src/examples/user-extensions/roles-permissions-extension.ts)

## Examples

### Complete Example: E-commerce User Extension

```typescript
import { Knex } from 'knex';
import { User } from '@forgebase-ts/auth';
import { extendUserTable } from '@forgebase-ts/auth/utils/user-extension';

// Define extended user type
interface EcommerceUser extends User {
  shipping_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  billing_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  default_payment_method?: string;
  customer_since?: Date;
  loyalty_points?: number;
  marketing_preferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Define fields
const ecommerceFields = [
  {
    name: 'shipping_address',
    type: 'json',
    nullable: true,
    description: 'Default shipping address',
  },
  {
    name: 'billing_address',
    type: 'json',
    nullable: true,
    description: 'Default billing address',
  },
  {
    name: 'default_payment_method',
    type: 'string',
    nullable: true,
    description: 'ID of default payment method',
  },
  {
    name: 'customer_since',
    type: 'timestamp',
    nullable: true,
    description: 'When the user became a customer',
  },
  {
    name: 'loyalty_points',
    type: 'integer',
    nullable: false,
    default: 0,
    description: 'Loyalty program points',
  },
  {
    name: 'marketing_preferences',
    type: 'json',
    nullable: true,
    default: JSON.stringify({
      email: true,
      sms: false,
      push: true,
    }),
    description: 'Marketing communication preferences',
  },
];

// Extend user table
async function setupEcommerceUser(knex: Knex) {
  await extendUserTable(knex, {
    fields: ecommerceFields,
  });
  
  // Add indexes for performance
  await knex.schema.alterTable('users', (table) => {
    table.index('loyalty_points');
    table.index('customer_since');
  });
}

// Example usage
async function createEcommerceUser(knex: Knex) {
  const user = await knex('users')
    .insert({
      email: 'customer@example.com',
      name: 'Example Customer',
      email_verified: true,
      shipping_address: JSON.stringify({
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'USA',
      }),
      customer_since: new Date(),
      loyalty_points: 100,
    })
    .returning('*');
    
  return user[0];
}
```
