// import { DynamicAuthManager } from '@forgebase-ts/auth';
// import { VoiceAuthPlugin } from '@forgebase-ts/auth/plugins/voice-auth';
// import { knex } from 'knex';

// // Database setup (using Knex)
// const db = knex({...});

// // Create the voice auth plugin with storage implementation
// const voiceAuthPlugin = new VoiceAuthPlugin<AppUser>({
//   minMatchConfidence: 0.9,
//   voiceprintStorage: {
//     saveVoiceprint: async (userId, voiceprint) => {
//       await db('user_voiceprints').insert({
//         user_id: userId,
//         voiceprint: voiceprint.toString('base64')
//       }).onConflict('user_id').merge();
//     },
//     getVoiceprint: async (userId) => {
//       const record = await db('user_voiceprints')
//         .where({ user_id: userId })
//         .first();
//       return record ? Buffer.from(record.voiceprint, 'base64') : null;
//     }
//   },
//   userLookup: async (identifier) => {
//     return await userService.findUser(identifier);
//   }
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
//   verificationService,
//   [voiceAuthPlugin] // Pass the plugin here
// );

// // Enable the voice provider in your configuration
// await configStore.updateConfig({
//   enabledProviders: [...existingProviders, 'voice']
// });

// const result = await authManager.login('voice', {
//   identifier: 'user@example.com',
//   audioData: 'base64EncodedAudioData...'
// });
