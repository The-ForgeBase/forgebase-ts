# @the-forgebase/api

## 0.0.0

### Minor Changes

- [#108](https://github.com/The-ForgeBase/forgebase-ts/pull/108) [`8a2996d`](https://github.com/The-ForgeBase/forgebase-ts/commit/8a2996d40d0038dd244609d56abed57b6d8b6b3d) Thanks [@SOG-web](https://github.com/SOG-web)! - refactor(all): update TypeScript config and package exports

  - Update tsconfig.cjs.json to use CommonJS with proper module resolution
  - Add typesVersions field to all packages for better TypeScript support
  - Update auth package exports to include adapter type definitions
  - Fix package.json exports to point to correct source paths
  - Add skipLibCheck and esModuleInterop for better compatibility

### Patch Changes

- Updated dependencies [[`8a2996d`](https://github.com/The-ForgeBase/forgebase-ts/commit/8a2996d40d0038dd244609d56abed57b6d8b6b3d)]:
  - @the-forgebase/database@0.0.0
  - @the-forgebase/storage@0.0.0
  - @the-forgebase/auth@0.0.0
