import { Knex } from 'knex';
import {
  extendUserTable,
  UserFieldDefinition,
} from '../../utils/user-extension';

/**
 * Extended user interface with profile fields
 */
declare module '../../types' {
  interface UserExtension {
    first_name?: string;
    last_name?: string;
    bio?: string;
    birth_date?: Date;
    location?: string;
    website?: string;
    avatar_url?: string;
    social_links?: Record<string, string>;
  }
}

/**
 * Profile field definitions
 */
export const profileFields: UserFieldDefinition[] = [
  {
    name: 'first_name',
    type: 'string',
    nullable: true,
    description: "User's first name",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'last_name',
    type: 'string',
    nullable: true,
    description: "User's last name",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'bio',
    type: 'text',
    nullable: true,
    description: "User's biography or description",
    validation: {
      maxLength: 1000,
    },
  },
  {
    name: 'birth_date',
    type: 'date',
    nullable: true,
    description: "User's date of birth",
  },
  {
    name: 'location',
    type: 'string',
    nullable: true,
    description: "User's location or address",
    validation: {
      maxLength: 200,
    },
  },
  {
    name: 'website',
    type: 'string',
    nullable: true,
    description: "User's website URL",
    validation: {
      isUrl: true,
      maxLength: 255,
    },
  },
  {
    name: 'avatar_url',
    type: 'string',
    nullable: true,
    description: "URL to user's avatar image",
    validation: {
      isUrl: true,
      maxLength: 255,
    },
  },
  {
    name: 'social_links',
    type: 'json',
    nullable: true,
    description: "User's social media links",
  },
];

/**
 * Extends the user table with profile fields
 * @param knex Knex instance
 * @returns Promise that resolves when the operation is complete
 */
export async function extendUserTableWithProfile(knex: Knex): Promise<void> {
  await extendUserTable(knex, {
    fields: profileFields,
    migrateExisting: true,
  });
}

/**
 * Example usage of the profile extension
 */
export async function profileExtensionExample(knex: Knex): Promise<void> {
  // 1. Extend the user table with profile fields
  await extendUserTableWithProfile(knex);

  // 2. Create a user with profile data
  const user = await knex('users')
    .insert({
      email: 'john.doe@example.com',
      name: 'John Doe',
      email_verified: true,
      first_name: 'John',
      last_name: 'Doe',
      bio: 'Software developer with a passion for open source',
      location: 'San Francisco, CA',
      website: 'https://johndoe.com',
      social_links: JSON.stringify({
        twitter: 'https://twitter.com/johndoe',
        github: 'https://github.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
      }),
    })
    .returning('*');

  console.log('Created user with profile:', user[0]);

  // 3. Update profile data
  await knex('users').where('id', user[0].id).update({
    bio: 'Updated bio with more information',
    avatar_url: 'https://example.com/avatars/johndoe.jpg',
  });

  // 4. Query user with profile data
  const updatedUser = await knex('users').where('id', user[0].id).first();

  console.log('Updated user profile:', updatedUser);
}
