import { Knex } from 'knex';
import { User } from '../../types';
import {
  extendUserTable,
  UserFieldDefinition,
} from '../../utils/user-extension';

/**
 * Extended user interface with business fields
 */
export interface BusinessUser extends User {
  company_name?: string;
  job_title?: string;
  department?: string;
  employee_id?: string;
  business_phone?: string;
  business_email?: string;
  tax_id?: string;
  company_size?: string;
  industry?: string;
  business_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  company_id?: string; // Foreign key to companies table
}

/**
 * Business field definitions
 */
export const businessFields: UserFieldDefinition[] = [
  {
    name: 'company_name',
    type: 'string',
    nullable: true,
    description: "Name of the user's company",
    validation: {
      maxLength: 200,
    },
  },
  {
    name: 'job_title',
    type: 'string',
    nullable: true,
    description: "User's job title or position",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'department',
    type: 'string',
    nullable: true,
    description: "User's department within the company",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'employee_id',
    type: 'string',
    nullable: true,
    description: "User's employee ID",
    validation: {
      maxLength: 50,
    },
  },
  {
    name: 'business_phone',
    type: 'string',
    nullable: true,
    description: "User's business phone number",
    validation: {
      isPhone: true,
      maxLength: 20,
    },
  },
  {
    name: 'business_email',
    type: 'string',
    nullable: true,
    description: "User's business email address",
    validation: {
      isEmail: true,
      maxLength: 255,
    },
  },
  {
    name: 'tax_id',
    type: 'string',
    nullable: true,
    description: 'Company tax ID or VAT number',
    validation: {
      maxLength: 50,
    },
  },
  {
    name: 'company_size',
    type: 'string',
    nullable: true,
    description: 'Size of the company (e.g., 1-10, 11-50, etc.)',
    validation: {
      maxLength: 20,
    },
  },
  {
    name: 'industry',
    type: 'string',
    nullable: true,
    description: 'Industry sector of the company',
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'business_address',
    type: 'json',
    nullable: true,
    description: "User's business address",
  },
  {
    name: 'company_id',
    type: 'uuid',
    nullable: true,
    description: "Reference to the user's company record",
    foreignKeys: {
      columnName: 'company_id',
      references: {
        tableName: 'companies',
        columnName: 'id',
      },
    },
  },
];

/**
 * Extends the user table with business fields
 * @param knex Knex instance
 * @returns Promise that resolves when the operation is complete
 */
export async function extendUserTableWithBusinessFields(
  knex: Knex
): Promise<void> {
  await extendUserTable(knex, {
    fields: businessFields,
    migrateExisting: true,
  });
}

/**
 * Example usage of the business extension
 */
export async function businessExtensionExample(knex: Knex): Promise<void> {
  // 1. Extend the user table with business fields
  await extendUserTableWithBusinessFields(knex);

  // 2. Create a user with business data
  const user = await knex('users')
    .insert({
      email: 'michael.johnson@example.com',
      name: 'Michael Johnson',
      email_verified: true,
      company_name: 'Acme Corporation',
      job_title: 'Senior Developer',
      department: 'Engineering',
      employee_id: 'EMP12345',
      business_phone: '+14155552671',
      business_email: 'michael.johnson@acmecorp.com',
      industry: 'Software Development',
      company_size: '51-200',
      business_address: JSON.stringify({
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'USA',
      }),
    })
    .returning('*');

  console.log('Created user with business data:', user[0]);

  // 3. Update business data
  await knex('users').where('id', user[0].id).update({
    job_title: 'Engineering Manager',
    department: 'Product Engineering',
  });

  // 4. Query user with business data
  const updatedUser = await knex('users').where('id', user[0].id).first();

  console.log('Updated user business data:', updatedUser);

  // 5. Example of using business data in application logic
  const businessAddress = JSON.parse(updatedUser.business_address);

  console.log(
    `${updatedUser.name} works at ${updatedUser.company_name} as ${updatedUser.job_title}`
  );
  console.log(
    `Business address: ${businessAddress.street}, ${businessAddress.city}, ${businessAddress.state} ${businessAddress.zip}`
  );
}
