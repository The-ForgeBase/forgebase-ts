# 🔐 Authentication Plugin Specification

This document defines the structure, behavior, and lifecycle of authentication plugins used in the ForgeBase authentication system. It supports both class-based and object-based plugins, with strict rules for context and lifecycle behavior.

---

## 📦 Plugin Formats

### ✅ 1. Object-Based Plugin (No `this`)

- Must be a plain object.
- Cannot rely on `this` — must capture external context via closure or dependency injection.
- Useful for simple stateless or semi-stateful plugin definitions.

```ts
const emailPasswordPlugin: AuthPlugin = {
  name: 'email-password',
  version: '1.0.0',
  steps: [...],
  initialize(container) {
    // Use closure to store references if needed
  }
};
```

---

### ✅ 2. Class-Based Plugin

- Must extend from a base plugin interface or class.
- Can safely use `this` for accessing services or shared state.
- Recommended for more complex plugins.

```ts
class EmailPasswordPlugin implements AuthPlugin {
  name = 'email-password';
  version = '1.0.0';

  constructor(private container: AwilixContainer<Cradle>) {}

  async initialize() {
    this.emailService = this.container.resolve('emailService');
  }

  steps = [...];
}
```

---

## 🧱 Plugin Interface

```ts
interface AuthPlugin {
  name: string;
  version: string;
  steps: AuthStep[];
  defaultConfig?: Record<string, any>;
  requiredInput?: RequiredInputShape;
  initialize?(container?: AwilixContainer): void | Promise<void>;
}
```

---

## 🪜 Step Structure

Each step is a discrete auth flow like `login`, `register`, etc.

```ts
interface AuthStep {
  name: string;
  description: string;
  validationSchema?: ValidationSchema;
  run(input: AuthInput): Promise<any>;
  hooks?: {
    before?: HookFunction[];
    after?: HookFunction[];
    onError?: (error: Error, input: AuthInput) => Promise<void>;
  };
}
```

---

## 📑 Validation Schema

```ts
type ValidationSchema = Record<string, ((value: any, input: AuthInput) => string | undefined)[]>;
```

You can also use Standard Schema compliant validators (see [Standard Schema Support](#standard-schema-support) below).

---

## ✅ Required Input Flags

Defines what the plugin step expects:

```ts
interface RequiredInputShape {
  reqBody?: boolean;
  reqQuery?: boolean;
  reqParams?: boolean;
  reqHeaders?: boolean;
  reqMethod?: boolean;
}
```

---

## 🪝 Hook Types

```ts
type HookFunction = (input: AuthInput, output?: any) => Promise<void>;
```

---

## 🚦Plugin Lifecycle

```mermaid
flowchart TD
  A[Plugin Registered] --> B[Initialize Called]
  B --> C[DI Container Injected (optional)]
  C --> D[Steps Available]

  D --> E[Step Invoked]
  E --> F[Run Before Hooks]
  F --> G[Validate Input]
  G --> H[Run Step Logic]
  H --> I[Run After Hooks]
  H --> J[Error Thrown?]

  J -- Yes --> K[Run onError Hook]
  J -- No --> L[Return Success]
```

---

## ⚠️ Object Plugin Restrictions

- ❌ Do **not** use `this` in `run` functions or hooks.
- ✅ Capture context using top-level variables or closures.
- ⚠️ If plugin requires internal state, switch to class format.

---

## 🧪 Example Registry

```ts
export const authPlugins: AuthPlugin[] = [emailPasswordPlugin, new MagicLinkPlugin(), new OauthPlugin()];
```

---

## ✅ Summary

| Format       | `this` Allowed | Lifecycle Support | Best For                    |
| ------------ | -------------- | ----------------- | --------------------------- |
| Object-based | ❌ No          | ✅ Yes            | Lightweight plugins         |
| Class-based  | ✅ Yes         | ✅ Yes            | Stateful or complex plugins |

---

## 🔄 Standard Schema Support

ReAuth supports [Standard Schema](https://standardschema.dev/) for validation, allowing you to use any compatible validation library (like Zod, Valibot, ArkType, etc.) with your plugins.

### Using Standard Schema in a Plugin

```typescript
import { type } from 'arktype';
import { createStandardSchemaRule } from '@the-forgebase/reauth/utils';

// Define schemas using ArkType (which implements standard-schema)
const emailSchema = type('string.email');
const passwordSchema = type('string.alphanumeric >= 3');

// Create validation rules using standard-schema
const loginValidation = {
  email: createStandardSchemaRule(emailSchema, 'Please enter a valid email address'),
  password: createStandardSchemaRule(passwordSchema, 'Password must be at least 8 characters'),
};
```

### Direct Validation with Standard Schema

You can also use the `standardValidate` utility function to validate data directly:

```typescript
import { standardValidate } from '@the-forgebase/reauth/utils';
import { type } from 'arktype';

const userSchema = type({
  email: 'string.email',
  password: 'string.alphanumeric >= 8',
});

try {
  const validatedUser = await standardValidate(userSchema, userData);
  console.log('Valid user data:', validatedUser);
} catch (error) {
  console.error('Validation failed:', error);
}
```

See the [Standard Schema Example Plugin](./src/plugins/standard-schema-example/README.md) for more details.
