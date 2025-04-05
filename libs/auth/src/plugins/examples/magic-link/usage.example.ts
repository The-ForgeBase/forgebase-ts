// import { DynamicAuthManager } from '@forgebase-ts/auth';
// import { MagicLinkPlugin } from '@forgebase-ts/auth/plugins/magic-link';
// import { CustomEmailService } from './email-service';

// // Create a custom email service (optional)
// const emailService = new CustomEmailService({
//   apiKey: 'your-sendgrid-key',
//   fromEmail: 'auth@yourdomain.com',
//   fromName: 'Auth System'
// });

// // Create the magic link plugin
// const magicLinkPlugin = new MagicLinkPlugin<AppUser>({
//   baseUrl: 'https://yourdomain.com',
//   tokenExpirySeconds: 1800, // 30 minutes
//   emailService // Optional custom email service
// });

// // Initialize auth manager with the plugin
// const authManager = new DynamicAuthManager(
//   configStore,
//   providers,
//   sessionManager,
//   userService,
//   5000,
//   true,
//   { knex: db },
//   EmailVerificationService,
//   [magicLinkPlugin] // Pass the plugin
// );

// // Enable the magic-link provider in your configuration
// await configStore.updateConfig({
//   enabledProviders: [...existingProviders, 'magic-link']
// });

// Authentication Flow
// 1. Request a magic link:

// await authManager.login('magic-link', { email: 'user@example.com' });
// // This will send an email with the magic link

// 2 User clicks the link in their email: The link will be in the format: https://yourdomain.com/auth/verify-magic-link?token=abc123

// 3 Verify the token when user visits the link:
// const { user, token } = await authManager.login('magic-link', { token: 'abc123' });
// // If valid, this returns the authenticated user and session token

// This plugin demonstrates how to create a complete authentication method that uses the getUserService() method from the auth manager, showcasing integration with the existing user database through the plugin architecture.
