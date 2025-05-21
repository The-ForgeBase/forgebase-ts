# Standard Schema Integration for ReAuth

This plugin demonstrates how to use [Standard Schema](https://standardschema.dev/) with ReAuth for validation.

## What is Standard Schema?

Standard Schema is a common interface designed to be implemented by JavaScript and TypeScript schema libraries. It allows you to use any compatible validation library (like Zod, Valibot, ArkType, etc.) with ReAuth.

## Usage

### 1. Using Standard Schema in a Plugin

The `standard-schema-auth.plugin.ts` file demonstrates how to use Standard Schema with ArkType for validation in a ReAuth plugin:

```typescript
import { type } from 'arktype';
import { createStandardSchemaRule } from '../../utils/standard-schema';

// Define schemas using ArkType (which implements standard-schema)
const emailSchema = type('string.email');
const passwordSchema = type('string.alphanumeric >= 3');

// Create validation rules using standard-schema
const loginValidation = {
  email: createStandardSchemaRule(emailSchema, 'Please enter a valid email address'),
  password: createStandardSchemaRule(passwordSchema, 'Password must be at least 8 characters'),
};
```

### 2. Direct Validation with Standard Schema

You can also use the `standardValidate` utility function to validate data directly:

```typescript
import { standardValidate } from '@the-forgebase/reauth/utils';
import { type } from 'arktype';
import * as z from 'zod';
import * as v from 'valibot';

// Define schemas using different libraries
const arktypeSchema = type('string');
const zodSchema = z.string();
const valibotSchema = v.string();

// Validate data with any standard-schema compliant validator
try {
  const arktypeResult = await standardValidate(arktypeSchema, 'hello');
  const zodResult = await standardValidate(zodSchema, 'hello');
  const valibotResult = await standardValidate(valibotSchema, 'hello');

  console.log('All validations passed!');
} catch (error) {
  console.error('Validation failed:', error);
}
```

### 3. Safe Validation (No Exceptions)

If you prefer not to use try/catch, you can use the `safeValidate` function:

```typescript
import { safeValidate } from '@the-forgebase/reauth/utils';
import { type } from 'arktype';

const userSchema = type({
  email: 'string.email',
  password: 'string.alphanumeric >= 3',
});

const result = await safeValidate(userSchema, {
  email: 'invalid-email',
  password: '123',
});

if (result.success) {
  console.log('Valid data:', result.value);
} else {
  console.error('Validation errors:', result.errors);
}
```

## Supported Libraries

Any validation library that implements the Standard Schema specification can be used, including:

- [Zod](https://zod.dev) (v3.24.0+)
- [Valibot](https://valibot.dev/) (v1.0+)
- [ArkType](https://arktype.io/) (v2.0+)
- [Effect Schema](https://effect.website/docs/schema/introduction/) (v3.13.0+)
- And many more!

## Benefits

- **Library Agnostic**: Use any validation library that implements Standard Schema
- **Type Safety**: Full TypeScript support with proper type inference
- **Consistent Error Format**: Standardized error reporting across different libraries
- **Future-Proof**: As more libraries adopt Standard Schema, they'll work automatically with ReAuth
