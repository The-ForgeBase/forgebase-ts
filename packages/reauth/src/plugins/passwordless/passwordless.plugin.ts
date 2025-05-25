import { AuthPlugin, AuthStep, Entity } from '../../types';
import { createAuthPlugin } from '../utils';
import { sign, SignOptions, verify } from 'jsonwebtoken';
import { type } from 'arktype';
import { createStandardSchemaRule } from '../../utils';

const emailSchema = type('string.email');
const phoneSchema = type('string.regex|/^\+?[1-9]\d{1,14}$/');
const token = type('string');

const plugin: AuthPlugin<AuthStepConfig> = {
  name: 'passwordless',
  getSensitiveFields: () => [
    'magiclink_code',
    'magiclink_code_expires_at',
    'otp_code',
    'otp_code_expires_at',
  ],
  steps: [
    {
      name: 'send-magiclink',
      description: '',
      validationSchema: {
        email: createStandardSchemaRule(
          emailSchema,
          'Please enter a valid email address',
        ),
      },
      hooks: {},
      inputs: ['email'],
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { email } = input;
        if (!config.generateToken) {
          throw new Error('No generate token function provided');
        }
        if (!config.send) {
          throw new Error('No send function provided');
        }
        const entity = await container.cradle.entityService.findEntity(
          email,
          'email',
        );
        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }
        if (config.checkEmailVerification && !entity.email_verified) {
          return {
            success: false,
            message: 'Email not verified',
            status: 'ev',
          };
        }
        const token = config.generateToken(email, config.secret, 'magiclink');
        await config.send(entity, token, email, 'magiclink');

        const expireTime =
          config.expireTime &&
          (config.expireTime as any).split('m')[0] * 60 * 1000;

        await container.cradle.entityService.updateEntity(email, 'email', {
          ...entity,
          magiclink_code: token,
          magiclink_code_expires_at: new Date(Date.now() + (expireTime || 0)),
        });

        return { success: true, message: 'Magic link sent', status: 'su' };
      },
      protocol: {
        http: {
          method: 'POST',
          unf: 401,
          ev: 400,
          su: 200,
        },
      },
    },
    {
      name: 'verify-magiclink',
      description: '',
      validationSchema: {
        token: createStandardSchemaRule(token, 'Please enter a valid token'),
      },
      hooks: {},
      inputs: ['token'],
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { token } = input;
        if (!config.verifyToken) {
          throw new Error('No verify token function provided');
        }

        const email = config.verifyToken(token!, config.secret, 'magiclink');

        if (!email) {
          return { success: false, message: 'Invalid token', status: 'ic' };
        }

        const entity = await container.cradle.entityService.findEntity(
          email,
          'email',
        );

        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }

        if (!entity.magiclink_code || entity.magiclink_code !== token) {
          return { success: false, message: 'Invalid token', status: 'ic' };
        }

        await container.cradle.entityService.updateEntity(email, 'email', {
          ...entity,
          magiclink_code: undefined,
          magiclink_code_expires_at: undefined,
        });

        if (
          entity.magiclink_code_expires_at &&
          entity.magiclink_code_expires_at < new Date()
        ) {
          return { success: false, message: 'Token expired', status: 'ic' };
        }

        const newToken = await container.cradle.sessionService.createSession(
          entity.id,
        );

        const serializedEntity = container.cradle.serializeEntity(entity);

        return {
          success: true,
          message: 'Login successful',
          token: newToken,
          entity: serializedEntity,
          status: 'su',
        };
      },
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
      name: 'send-otp',
      description: '',
      validationSchema: {
        phone: createStandardSchemaRule(
          phoneSchema,
          'Please enter a valid phone number',
        ),
      },
      hooks: {},
      inputs: ['phone'],
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { phone } = input;
        if (!config.generateToken) {
          throw new Error('No generate token function provided');
        }
        if (!config.send) {
          throw new Error('No send function provided');
        }
        const entity = await container.cradle.entityService.findEntity(
          phone,
          'phone',
        );
        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }
        if (config.checkPhoneVerification && !entity.phone_verified) {
          return {
            success: false,
            message: 'Phone not verified',
            status: 'ev',
          };
        }
        const token = config.generateToken(phone, config.secret, 'otp');
        await config.send(entity, token, phone, 'otp');

        const expireTime =
          config.expireTime &&
          (config.expireTime as any).split('m')[0] * 60 * 1000;

        await container.cradle.entityService.updateEntity(phone, 'phone', {
          ...entity,
          otp_code: token,
          otp_code_expires_at: new Date(Date.now() + (expireTime || 0)),
        });

        return { success: true, message: 'OTP sent', status: 'su' };
      },
      protocol: {
        http: {
          method: 'POST',
          unf: 401,
          ev: 400,
          su: 200,
        },
      },
    },
    {
      name: 'verify-otp',
      description: '',
      validationSchema: {
        token: createStandardSchemaRule(token, 'Please enter a valid token'),
      },
      hooks: {},
      inputs: ['token'],
      run: async function (input, pluginProperties) {
        const { container, config } = pluginProperties!;
        const { token } = input;
        if (!config.verifyToken) {
          throw new Error('No verify token function provided');
        }

        const phone = config.verifyToken(token!, config.secret, 'otp');

        if (!phone) {
          return { success: false, message: 'Invalid token', status: 'ic' };
        }

        const entity = await container.cradle.entityService.findEntity(
          phone,
          'phone',
        );

        if (!entity) {
          return { success: false, message: 'User not found', status: 'unf' };
        }

        if (!entity.otp_code || entity.otp_code !== token) {
          return { success: false, message: 'Invalid token', status: 'ic' };
        }

        await container.cradle.entityService.updateEntity(phone, 'phone', {
          ...entity,
          otp_code: undefined,
          otp_code_expires_at: undefined,
        });

        if (
          entity.otp_code_expires_at &&
          entity.otp_code_expires_at < new Date()
        ) {
          return { success: false, message: 'Token expired', status: 'ic' };
        }

        const newToken = await container.cradle.sessionService.createSession(
          entity.id,
        );

        const serializedEntity = container.cradle.serializeEntity(entity);

        return {
          success: true,
          message: 'Login successful',
          token: newToken,
          entity: serializedEntity,
          status: 'su',
        };
      },
      protocol: {
        http: {
          method: 'POST',
          ic: 400,
          su: 200,
          unf: 401,
        },
      },
    },
  ],
  initialize: async function (container) {
    this.container = container;
  },
  config: {
    secret: 'secrete',
    checkPhoneVerification: false,
    checkEmailVerification: false,
    expireTime: '10m',
    generateToken: function (
      emailorphone: string,
      secret: string,
      type: 'magiclink' | 'otp',
    ) {
      const payload = { emailorphone, type };
      const options: SignOptions = { expiresIn: this.expireTime! as any };
      return sign(payload, secret, options);
    },
    verifyToken: (
      token: string,
      secret: string,
      type: 'magiclink' | 'otp',
    ): string | null => {
      const result: any = verify(token, secret);

      if (!result) return null;

      if (result.type !== type) return null;

      return result.emailorphone;
    },
  },
  migrationConfig: {
    pluginName: 'passwordless',
    extendTables: [
      {
        tableName: 'entities',
        columns: {
          magiclink_code: { type: 'string', nullable: true },
          magiclink_code_expires_at: { type: 'timestamp', nullable: true },
          otp_code: { type: 'string', nullable: true },
          otp_code_expires_at: { type: 'timestamp', nullable: true },
          phone: { type: 'string', nullable: true },
          phone_verified: { type: 'boolean', index: true, defaultValue: false },
        },
      },
    ],
  },
};

export default function passwordlessAuth(
  config?: Partial<AuthPlugin<AuthStepConfig>>,
  overrideStep?: {
    name: string;
    override: Partial<AuthStep<AuthStepConfig>>;
  }[],
): AuthPlugin {
  return createAuthPlugin(config || {}, plugin, overrideStep);
}

interface AuthStepConfig {
  /**
   * @default 'secrete'
   */
  secret: string;
  /**
   * @default '10m'
   * should be in minutes
   * @example '10m'
   */
  expireTime?: string;
  /**
   * @default false
   */
  checkPhoneVerification?: boolean;
  /**
   * @default false
   */
  checkEmailVerification?: boolean;
  /**
   * Generate token function
   * @param emailorphone The email or phone to generate the token for
   * @param secret The secret to generate the token with
   * @param type The type of token to generate (magiclink or otp)
   * @returns string
   * @example
   * generateToken: (emailorphone, secret, type) => {
   *  const payload = { emailorphone, type };
   *  const options: SignOptions = { expiresIn: this.expireTime! as any };
   *  return sign(payload, secret, options);
   * }
   */
  generateToken?: (
    emailorphone: string,
    secret: string,
    type: 'magiclink' | 'otp',
  ) => string;
  /**
   * Verify token function
   * @param token The token to verify
   * @param secret The secret to verify the token with
   * @param type The type of token to verify (magiclink or otp)
   * @returns string | null
   * @example
   * verifyToken: (token, secret, type) => {
   *  const result: any = verify(token, secret);
   *
   *  if (!result) return null;
   *
   *  if (result.type !== type) return null;
   *
   *  return result.emailorphone;
   * }
   */
  verifyToken?: (
    token: string,
    secret: string,
    type: 'magiclink' | 'otp',
  ) => string | null;
  /**
   * Send function
   * @param entity The entity to send the token to
   * @param token The token to send
   * @param emailorphone The email or phone to send the token to
   * @param type The type of token to send (magiclink or otp)
   * @returns Promise<void>
   * @example
   * send: async (entity, token, emailorphone, type) => {
   *  if (type === 'magiclink') {
   *    // the magiclink should be your frontend url or your backend url + /verify-magiclink?token=${token}
   *    await sendMagicLinkEmail(entity, token, emailorphone);
   *  } else {
   *    await sendOtpSms(entity, token, emailorphone);
   *  }
   * }
   */
  send?: (
    entity: Partial<Entity>,
    token: string | number,
    emailorphone: string,
    type: 'magiclink' | 'otp',
  ) => Promise<void>;
}

declare module '../../types' {
  interface EntityExtension {
    magiclink_code?: string | undefined;
    magiclink_code_expires_at?: Date | undefined;
    otp_code?: string | undefined;
    otp_code_expires_at?: Date | undefined;
    phone?: string | undefined;
    phone_verified?: boolean;
  }
}
