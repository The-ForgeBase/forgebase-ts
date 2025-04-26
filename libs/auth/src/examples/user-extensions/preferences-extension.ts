import { Knex } from 'knex';
import {
  extendUserTable,
  UserFieldDefinition,
} from '../../utils/user-extension';

/**
 * Extended user interface with preference fields
 */
declare module '../../types' {
  interface UserExtension {
    theme_preference?: 'light' | 'dark' | 'system';
    language_preference?: string;
    notification_settings?: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
    };
    timezone?: string;
    date_format?: string;
    time_format?: string;
  }
}

/**
 * Preference field definitions
 */
export const preferenceFields: UserFieldDefinition[] = [
  {
    name: 'theme_preference',
    type: 'string',
    nullable: true,
    default: 'system',
    description: "User's theme preference (light, dark, or system)",
    validation: {
      pattern: '^(light|dark|system)$',
    },
  },
  {
    name: 'language_preference',
    type: 'string',
    nullable: true,
    default: 'en',
    description: "User's preferred language (ISO code)",
    validation: {
      pattern: '^[a-z]{2}(-[A-Z]{2})?$',
      maxLength: 10,
    },
  },
  {
    name: 'notification_settings',
    type: 'json',
    nullable: true,
    default: JSON.stringify({
      email: true,
      push: true,
      sms: false,
      marketing: false,
    }),
    description: "User's notification preferences",
  },
  {
    name: 'timezone',
    type: 'string',
    nullable: true,
    description: "User's timezone (IANA format)",
    validation: {
      maxLength: 50,
    },
  },
  {
    name: 'date_format',
    type: 'string',
    nullable: true,
    default: 'YYYY-MM-DD',
    description: "User's preferred date format",
    validation: {
      maxLength: 20,
    },
  },
  {
    name: 'time_format',
    type: 'string',
    nullable: true,
    default: 'HH:mm',
    description: "User's preferred time format",
    validation: {
      maxLength: 20,
    },
  },
];

/**
 * Extends the user table with preference fields
 * @param knex Knex instance
 * @returns Promise that resolves when the operation is complete
 */
export async function extendUserTableWithPreferences(
  knex: Knex
): Promise<void> {
  await extendUserTable(knex, {
    fields: preferenceFields,
    migrateExisting: true,
  });
}

/**
 * Example usage of the preferences extension
 */
export async function preferencesExtensionExample(knex: Knex): Promise<void> {
  // 1. Extend the user table with preference fields
  await extendUserTableWithPreferences(knex);

  // 2. Create a user with preference data
  const user = await knex('users')
    .insert({
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      email_verified: true,
      theme_preference: 'dark',
      language_preference: 'en-US',
      notification_settings: JSON.stringify({
        email: true,
        push: false,
        sms: true,
        marketing: false,
      }),
      timezone: 'America/New_York',
    })
    .returning('*');

  console.log('Created user with preferences:', user[0]);

  // 3. Update preference data
  await knex('users')
    .where('id', user[0].id)
    .update({
      theme_preference: 'light',
      notification_settings: JSON.stringify({
        email: true,
        push: true,
        sms: true,
        marketing: true,
      }),
    });

  // 4. Query user with preference data
  const updatedUser = await knex('users').where('id', user[0].id).first();

  console.log('Updated user preferences:', updatedUser);

  // 5. Example of using preferences in application logic
  const notificationSettings = JSON.parse(updatedUser.notification_settings);

  if (notificationSettings.email) {
    console.log('Would send email notification to:', updatedUser.email);
  }

  if (notificationSettings.sms && updatedUser.phone) {
    console.log('Would send SMS notification to:', updatedUser.phone);
  }
}
