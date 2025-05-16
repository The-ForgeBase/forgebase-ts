---
'@the-forgebase/database': minor
'@the-forgebase/storage': minor
'@the-forgebase/common': minor
'@the-forgebase/auth': minor
'@the-forgebase/api': minor
'@the-forgebase/sdk': minor
---

refactor(all): update TypeScript config and package exports

- Update tsconfig.cjs.json to use CommonJS with proper module resolution
- Add typesVersions field to all packages for better TypeScript support
- Update auth package exports to include adapter type definitions
- Fix package.json exports to point to correct source paths
- Add skipLibCheck and esModuleInterop for better compatibility
