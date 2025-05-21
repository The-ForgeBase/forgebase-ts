import { ReAuth, StandardSchemaAuth } from '../src';
import { type } from 'arktype';
import { standardValidate, safeValidate } from '../src/utils';

// Create a new ReAuth instance with the StandardSchemaAuth plugin
const reauth = new ReAuth([new StandardSchemaAuth()]);

// Example 1: Using the StandardSchemaAuth plugin
async function exampleUsingPlugin() {
  console.log('Example 1: Using the StandardSchemaAuth plugin');
  
  try {
    // Execute the login step with valid data
    const result = await reauth.executeStep('standard-schema-auth', 'login', {
      reqBody: {
        email: 'user@example.com',
        password: 'password123',
      },
    });
    
    console.log('Login successful:', result);
  } catch (error) {
    console.error('Login failed:', error);
  }
  
  try {
    // Execute the login step with invalid data
    const result = await reauth.executeStep('standard-schema-auth', 'login', {
      reqBody: {
        email: 'invalid-email',
        password: '123', // Too short
      },
    });
    
    console.log('Login successful:', result);
  } catch (error) {
    console.error('Login failed:', error);
  }
}

// Example 2: Using standardValidate directly
async function exampleUsingStandardValidate() {
  console.log('\nExample 2: Using standardValidate directly');
  
  // Define a schema using ArkType
  const userSchema = type({
    email: 'string|>email',
    password: 'string|min:8',
    name: 'string?',
    age: 'number?|>= 18',
  });
  
  // Valid data
  const validUser = {
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
    age: 25,
  };
  
  // Invalid data
  const invalidUser = {
    email: 'invalid-email',
    password: '123', // Too short
    age: 16, // Too young
  };
  
  try {
    // Validate valid data
    const validatedUser = await standardValidate(userSchema, validUser);
    console.log('Valid user:', validatedUser);
  } catch (error) {
    console.error('Validation failed:', error);
  }
  
  try {
    // Validate invalid data
    const validatedUser = await standardValidate(userSchema, invalidUser);
    console.log('Valid user:', validatedUser);
  } catch (error) {
    console.error('Validation failed:', error);
  }
}

// Example 3: Using safeValidate (no exceptions)
async function exampleUsingSafeValidate() {
  console.log('\nExample 3: Using safeValidate (no exceptions)');
  
  // Define a schema using ArkType
  const userSchema = type({
    email: 'string|>email',
    password: 'string|min:8',
    name: 'string?',
    age: 'number?|>= 18',
  });
  
  // Valid data
  const validUser = {
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
    age: 25,
  };
  
  // Invalid data
  const invalidUser = {
    email: 'invalid-email',
    password: '123', // Too short
    age: 16, // Too young
  };
  
  // Validate valid data
  const validResult = await safeValidate(userSchema, validUser);
  if (validResult.success) {
    console.log('Valid user:', validResult.value);
  } else {
    console.error('Validation errors:', validResult.errors);
  }
  
  // Validate invalid data
  const invalidResult = await safeValidate(userSchema, invalidUser);
  if (invalidResult.success) {
    console.log('Valid user:', invalidResult.value);
  } else {
    console.error('Validation errors:', invalidResult.errors);
  }
}

// Run all examples
async function runExamples() {
  await exampleUsingPlugin();
  await exampleUsingStandardValidate();
  await exampleUsingSafeValidate();
}

runExamples().catch(console.error);
