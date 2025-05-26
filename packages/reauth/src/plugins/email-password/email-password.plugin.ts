import { type } from 'arktype';
import { AuthPlugin, AuthStep, Entity } from '../../types';
import { createStandardSchemaRule } from '../../utils';
import { hashPassword, haveIbeenPawned, verifyPasswordHash } from '../../lib';
import { createAuthPlugin } from '../utils/create-plugin';

const emailSchema = type('string.email');
const passwordSchema = type(
  'string.regex|/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/',
);

const loginValidation = {
  email: createStandardSchemaRule(
    emailSchema,
    'Please enter a valid email address',
  ),
  password: createStandardSchemaRule(
    passwordSchema,
    'Password must be at least 8 characters',
  ),
};

const plugin: AuthPlugin<AuthStepConfig> = {
  name: 'email-password',
  getSensitiveFields: () => [
    'password_hash',
    'email_verification_code',
    'reset_password_code',
    'reset_password_code_expires_at',
  ],
  steps: [
    {
      name: 'login',
      description: 'Authenticate user with email and password',
      validationSchema: loginValidation,
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { email, password } = input;

        const entity = await container.cradle.entityService.findEntity(
          email,
          'email',
        );

        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }

        if (config.verifyEmail && !entity.email_verified) {
          if (!config.sendCode) {
            throw new Error('No send code function provided');
          }

          if (!config.generateCode) {
            throw new Error('No generate code function');
          }

          const code = await config.generateCode(entity.email, entity);

          await container.cradle.entityService.updateEntity(
            entity.email,
            'email',
            {
              ...entity,
              email_verification_code: code,
            },
          );

          await config.sendCode(entity, code, entity.email, 'verify');

          return {
            success: false,
            message: 'User Email verification is requred',
            status: 'eq',
          };
        }

        if (!entity.password_hash) {
          return {
            success: false,
            message: 'This user does not have a password',
            status: 'unf',
          };
        }

        const passwordMatch = await verifyPasswordHash(
          entity.password_hash,
          password,
        );

        if (!passwordMatch) {
          return { success: false, message: 'Invalid password', status: 'ip' };
        }

        const token = await container.cradle.sessionService.createSession(
          entity.id,
        );

        // Create a copy of the entity with sensitive fields redacted
        const serializedEntity = container.cradle.serializeEntity(entity);

        return {
          success: true,
          message: 'Login successful',
          token,
          entity: serializedEntity,
          status: 'su',
        };
      },
      hooks: {},
      inputs: ['email', 'password'],
      protocol: {
        http: {
          method: 'POST',
          unf: 401,
          ip: 400,
          su: 200,
          eq: 300,
        },
      },
    },
    {
      name: 'register',
      description: 'Register a new user with email and password',
      validationSchema: loginValidation,
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { email, password } = input;

        const savePassword = await haveIbeenPawned(password);

        if (!savePassword) {
          return {
            success: false,
            message: 'Password has been pawned',
            status: 'ip',
          };
        }

        const entity = await container.cradle.entityService.createEntity({
          email,
          password_hash: await hashPassword(password),
          email_verified: false,
        });

        if (config.verifyEmail) {
          if (!config.sendCode) {
            throw new Error('No send code function provided');
          }

          if (!config.generateCode) {
            throw new Error('No generate code function');
          }

          const code = await config.generateCode(entity.email, entity);

          await container.cradle.entityService.updateEntity(
            entity.email,
            'email',
            {
              ...entity,
              email_verification_code: code,
            },
          );

          await config.sendCode(entity, code, entity.email, 'verify');
        }

        const token = config.loginOnRegister
          ? await container.cradle.sessionService.createSession(entity.id)
          : undefined;

        const serializedEntity = container.cradle.serializeEntity(entity);

        return {
          success: true,
          message: 'Register successful',
          token,
          entity: serializedEntity,
          status: 'su',
        };
      },
      hooks: {},
      inputs: ['email', 'password'],
      protocol: {
        http: {
          method: 'POST',
          ip: 400,
          su: 200,
        },
      },
    },
    {
      name: 'verify-email',
      description: 'Verify email',
      run: async function (input, pluginProperties) {
        const { container } = pluginProperties!;
        const { email, code } = input;

        const entity = await container.cradle.entityService.findEntity(
          email,
          'email',
        );

        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }

        if (entity.email_verified) {
          return {
            success: true,
            message: 'Email already verified',
            status: 'su',
          };
        }

        if (entity.email_verification_code !== code) {
          return { success: false, message: 'Invalid code', status: 'ic' };
        }

        entity.email_verified = true;
        entity.email_verification_code = undefined;
        await container.cradle.entityService.updateEntity(
          entity.email,
          'email',
          entity,
        );

        return {
          success: true,
          message: 'Email verified',
          status: 'su',
        };
      },
      hooks: {},
      inputs: ['email', 'code'],
      protocol: {
        http: {
          method: 'POST',
          ic: 400,
          su: 200,
          unf: 401,
        },
      },
    },
    {
      name: 'resend-verify-email',
      description: 'Resend verify email',
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { email } = input;

        const entity = await container.cradle.entityService.findEntity(
          email,
          'email',
        );

        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }

        if (entity.email_verified) {
          return {
            success: true,
            message: 'Email already verified',
            status: 'su',
          };
        }

        if (!entity.email_verification_code) {
          return {
            success: false,
            message: 'No verification code',
            status: 'nc',
          };
        }

        await container.cradle.entityService.updateEntity(
          entity.email,
          'email',
          {
            ...entity,
            email_verification_code: undefined,
          },
        );

        if (!config.sendCode) {
          throw new Error('No send code function provided');
        }

        await config.sendCode(
          entity,
          entity.email_verification_code,
          entity.email,
          'verify',
        );

        return {
          success: true,
          message: 'Verification code resent',
          status: 'su',
        };
      },
      hooks: {},
      inputs: ['email'],
      protocol: {
        http: {
          method: 'POST',
          nc: 400,
          su: 200,
          unf: 401,
        },
      },
    },
    {
      name: 'send-reset-password',
      description: 'Send reset password',
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { email } = input;

        const entity = await container.cradle.entityService.findEntity(
          email,
          'email',
        );

        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }

        if (!entity.email_verified) {
          return {
            success: false,
            message: 'Email not verified',
            status: 'ev',
          };
        }

        if (!config.sendCode) {
          throw new Error('No send code function provided');
        }

        if (!config.generateCode) {
          throw new Error('No generate code function');
        }

        const code = await config.generateCode(entity.email, entity);

        await container.cradle.entityService.updateEntity(
          entity.email,
          'email',
          {
            ...entity,
            reset_password_code: code,
            reset_password_code_expires_at: new Date(
              Date.now() +
                (config.resetPasswordCodeExpiresIn || 30 * 60 * 1000),
            ),
          },
        );

        await config.sendCode(entity, code, entity.email, 'reset');

        return {
          success: true,
          message: 'Reset password code sent',
          status: 'su',
        };
      },
      hooks: {},
      inputs: ['email'],
      protocol: {
        http: {
          method: 'POST',
          ev: 400,
          su: 200,
          unf: 401,
        },
      },
    },
    {
      name: 'reset-password',
      description: 'Reset password',
      run: async function (input, pluginProperties) {
        const { container } = pluginProperties!;
        const { email, password, code } = input;

        const entity = await container.cradle.entityService.findEntity(
          email,
          'email',
        );

        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }

        const savePassword = await haveIbeenPawned(password);

        if (!savePassword) {
          return {
            success: false,
            message: 'Password has been pawned',
            status: 'ip',
          };
        }

        if (
          entity.reset_password_code !== code ||
          entity.reset_password_code_expires_at! < new Date()
        ) {
          await container.cradle.entityService.updateEntity(
            entity.email,
            'email',
            {
              ...entity,
              reset_password_code: undefined,
              reset_password_code_expires_at: undefined,
            },
          );
          return { success: false, message: 'Invalid code', status: 'ic' };
        }

        await container.cradle.entityService.updateEntity(
          entity.email,
          'email',
          {
            ...entity,
            password_hash: await hashPassword(password),
            reset_password_code: undefined,
            reset_password_code_expires_at: undefined,
          },
        );

        return {
          success: true,
          message: 'Password reset successful',
          status: 'su',
        };
      },
      hooks: {},
      inputs: ['email', 'password', 'code'],
      protocol: {
        http: {
          method: 'POST',
          ic: 400,
          ip: 400,
          su: 200,
          unf: 401,
        },
      },
    },
  ],
  initialize: async function (container) {
    this.container = container;
  },
  migrationConfig: {
    pluginName: 'email-password',
    extendTables: [
      {
        tableName: 'entities',
        columns: {
          email: {
            type: 'string',
            nullable: false,
            unique: true,
            index: true,
          },
          email_verified: {
            type: 'boolean',
            index: true,
            defaultValue: true,
          },
          password_hash: {
            type: 'string',
            unique: true,
            nullable: true,
          },
          email_verification_code: {
            type: 'string',
            nullable: true,
          },
          reset_password_code: {
            type: 'string',
            nullable: true,
          },
          reset_password_code_expires_at: {
            type: 'timestamp',
            nullable: true,
          },
        },
      },
    ],
  },
  config: {
    verifyEmail: false,
    loginOnRegister: true,
    codeLenght: 4,
    generateCode: async function (email, entity) {
      if (this.codeType === 'numeric') {
        return Array(this.codeLenght!)
          .fill(0)
          .map(() => String.fromCharCode(48 + Math.floor(Math.random() * 10)))
          .join('');
      }

      if (this.codeType === 'alphanumeric') {
        return Array(this.codeLenght!)
          .fill(0)
          .map(() =>
            String.fromCharCode(
              48 + Math.floor(Math.random() * (122 - 48 + 1)) + 48,
            ),
          )
          .join('');
      }

      if (this.codeType === 'alphabet') {
        return Array(this.codeLenght!)
          .fill(0)
          .map(() =>
            String.fromCharCode(
              97 + Math.floor(Math.random() * (122 - 97 + 1)) + 97,
            ),
          )
          .join('');
      }

      return Array(this.codeLenght!)
        .fill(0)
        .map(() =>
          String.fromCharCode(
            48 + Math.floor(Math.random() * (122 - 48 + 1)) + 48,
          ),
        )
        .join('');
    },
    resetPasswordCodeExpiresIn: 30 * 60 * 1000,
    codeType: 'numeric',
  },
};

const emailPasswordAuth = (
  config?: Partial<AuthPlugin<AuthStepConfig>>,
  overrideStep?: {
    name: string;
    override: Partial<AuthStep<AuthStepConfig>>;
  }[],
): AuthPlugin => {
  return createAuthPlugin(config || {}, plugin, overrideStep);
};

export default emailPasswordAuth;

declare module '../../types' {
  interface EntityExtension {
    email: string;
    password_hash: string;
    email_verified: boolean;
    email_verification_code?: string | number | undefined;
    reset_password_code?: string | number | undefined;
    reset_password_code_expires_at?: Date | undefined;
  }
}

interface AuthStepConfig {
  /**
   * @default false
   * Whether to verify the email after registration
   */
  verifyEmail?: boolean;
  /**
   * @default true
   * Whether to login the user after registration
   */
  loginOnRegister?: boolean;
  /**
   * @default 'numeric'
   * @options 'numeric' | 'alphanumeric' | 'alphabet'
   */
  codeType?: 'numeric' | 'alphanumeric' | 'alphabet';
  /**
   * @default 4
   * should be between 4 and 10
   */
  codeLenght?: number;
  /**
   * Send function
   * @param entity The entity to send the code to
   * @param code The code to send
   * @param email The email to send the code to
   * @param type The type of code to send (verify or reset)
   * @returns Promise<void>
   * @example
   * sendCode: async (entity, code, email, type) => {
   *  if (type === 'verify') {
   *    // the code should be your frontend url or your backend url + /verify-email?code=${code}&email=${email}
   *    await sendVerifyEmail(entity, code, email);
   *  } else {
   *    // the code should be your frontend url + /reset-password?code=${code}&email=${email}
   *    await sendResetPasswordEmail(entity, code, email);
   *  }
   * }
   */
  sendCode?: (
    entity: Partial<Entity>,
    code: string | number,
    email: string,
    type: 'verify' | 'reset',
  ) => Promise<void>;
  /**
   * Generate code function
   * @param email The email to generate the code for
   * @param entity The entity to generate the code for
   * @returns Promise<string | number>
   * @example
   * generateCode: async (email, entity) => {
   *  return Math.random().toString(36).slice(-6);
   * }
   */
  generateCode?: (email: string, entity?: Entity) => Promise<string | number>;
  /**
   * @default 30 * 60 * 1000
   * should be in milliseconds
   */
  resetPasswordCodeExpiresIn?: number;
}

//TODO: use change password step as an example on the docs
