# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Features

### Bug Fixes

### Breaking Changes

### Other Changes
* Merge pull request #79 from The-ForgeBase/nest (7e18a7b)
* build: migrate to ESM and add tsup for bundling (fdaf812)
* feat(auth): add middleware and CORS support to web auth API (821f6f7)
* feat(auth): add CORS support and middleware handling in AuthApi (d0b39d0)
* feat(api): add beforeMiddlewares and finallyMiddlewares options (d4c9eeb)
* refactor(auth): return response in attachNewToken middleware (d7174f1)
* refactor(web): simplify error handling and remove debug logs (b43c56c)
* refactor: update authMiddleware return type to Promise<Response | undefined> (03892a0)
* refactor(auth): restructure web endpoints and enhance middleware (3ff0b4a)
* refactor(web): remove unused handler and update route handling logic (fdb86b7)
* feat(web): integrate itty-router for web handlers and auth endpoints (42d2f6e)
* feat(web): add web handler and SSE support for API endpoints (a92875d)
* refactor(hono): simplify type definitions and enhance SSE handler (e956b21)
* chore: update dependencies and modify SSE and database configurations (1d1a988)
* feat(database): add simulate create, update, and delete functionality (452fcec)
* feat(test-angular): add initial setup for Angular application (3082acc)
* refactor: update configurations and improve SSE initialization (75875ab)
* feat(hono): enhance Hono integration with new route display and configuration updates refactor(api): update ForgeApi and DatabaseService constructors for improved flexibility chore(database): add TypeScript configuration files for CommonJS and ESM modules (c660b5b)
* feat(api): refactor Hono integration and database service configuration (01e1fbf)
* hono (3320294)
* fix(basic-usage): update import path for createHonoForgeApi to use relative path (6568729)
* feat(hono): enhance Hono integration with SSE support and improved service handling (42ed3d9)
* feat(hono): add Hono integration with middleware for authentication and admin access control (ddea785)
* feat(tests): add comprehensive test plan for SSE adapter including unit, integration, performance, and browser compatibility tests (b303ae0)
* fix(dont_touch): update admin key for security reasons (5bcd6a4)
* feat(sse): implement SSE module with controller, service, and test page for Server-Sent Events functionality (bede8c1)
* feat(sse): enhance SSEManager with request handling and integration examples for Express and HTTP server (d7f7e1b)
* feat(database): implement SSE adapter using crossws pub/sub for realtime table broadcast (72eaa87)
* feat(database): Add automatic permission initialization feature (19318ac)
* feat(auth): Add initial API key creation and management functionality for super admins (2c829bd)
* feat(api-keys): Implement admin API key management with create, list, update, and delete functionalities (078d9b3)
* fix(auth): Remove unnecessary dependencies in reset password effect and improve token verification logging (2ffad22)
* feat(auth): Add access_token field to refresh tokens and improve session management (b0d7936)
* fix: improve token management and NextJS adapter compatibility (3d3fdd6)
* feat(database): Add support for excluding tables in database operations (108f5b2)
* Refactor OAuth provider database table references to use constants from config (4768a81)
* fix: Improve error handling for authentication and permissions (3175e9b)
* fix: Remove rawExpression method to prevent SQL injection (7647112)
* feat: Always fetch user details from server in auth libraries (8ed569e)
* feat(database): Enhance DatabaseSDK with new base URL configuration and improved record handling (01e5f68)
* fix(database): Adjust connection pool settings for improved performance and stability feat(auth): Add logging for admin table initialization fix(database): Enhance transaction error handling in ForgeDatabase class refactor(database): Update endpoint signatures for consistency (2e4f61c)
* fix: Resolve database connection pool timeout issues (de73299)
* feat(database): Add transaction support with automatic management (133ccb7)
* feat: add language support section with cards for JavaScript, Go, Rust, PHP, and Python (21c7ccc)
* feat: restructure plugins configuration in Vite for improved readability (a698334)
* feat: update configuration files for Vite, Nx, and Vercel integration (8cddd2d)
* feat: implement new layout components for documentation site (83c3a4f)
* feat(auth): add foreign keys support to user table extension (4261f15)
* feat(auth): implement user table extension API and documentation (3a9402b)
* feat(rls): add comprehensive tests for CV creation permissions using customSql and customFunction (b793d49)
* feat(rls): allow evaluation of multiple permission rules in sequence (ad359af)
* feat(database): enhance permission checks with custom function support and add comprehensive tests (211ef45)
* feat(database): enhance RLS with customSql execution and custom function support (bd97a05)
* feat(auth): add token validation for cross-platform authentication (5f7f407)
* feat: Implement change password functionality (c7af05a)
* fix(auth): remove sensitive user data from auth responses (38e4554)
* feat: add email verification page and middleware for authentication (433bb8b)
* Merge pull request #30 from The-ForgeBase/main (e244030)

For changes in previous releases, please check the Git history.
