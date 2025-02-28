import { haveIbeenPawned, verifyPasswordHash } from '../lib/password';
import {
  User,
  AuthProvider,
  UserNotFoundError,
  InvalidCredentialsError,
  AuthConfig,
  VerificationService,
} from '../types';
import { KnexUserService } from '../userService';

export class LocalAuthProvider<TUser extends User>
  implements AuthProvider<TUser>
{
  constructor(
    private userService: KnexUserService<TUser>,
    private config: AuthConfig // private hashCompare?: (plain: string, hash: string) => Promise<boolean>
  ) {}

  async authenticate(credentials: { email: string; password: string }) {
    const user = await this.userService.findUser(credentials.email);
    if (!user) throw new UserNotFoundError(credentials.email);

    const isValid = await verifyPasswordHash(
      user.password_hash,
      credentials.password
    );

    if (!isValid) throw new InvalidCredentialsError();
    return user;
  }

  async register(user: Partial<TUser>, password: string): Promise<TUser> {
    try {
      if (password.length < this.config.passwordPolicy.minLength) {
        throw new Error('Password too short');
      }

      if (password.length > 255) {
        throw new Error('Password too long');
      }

      if (
        !/[A-Z]/.test(password) &&
        this.config.passwordPolicy.requireUppercase
      ) {
        throw new Error('Password must contain at least one uppercase letter');
      }

      if (
        !/[a-z]/.test(password) &&
        this.config.passwordPolicy.requireLowercase
      ) {
        throw new Error('Password must contain at least one lowercase letter');
      }

      if (!/[0-9]/.test(password) && this.config.passwordPolicy.requireNumber) {
        throw new Error('Password must contain at least one number');
      }

      if (
        !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) &&
        this.config.passwordPolicy.requireSpecialChar
      ) {
        throw new Error('Password must contain at least one special character');
      }

      const hasBeenPawned = await haveIbeenPawned(password);
      if (!hasBeenPawned) {
        throw new Error(
          'This Password has been pawned (it is not secure), please choose another one'
        );
      }

      return await this.userService.createUser(user, password);
    } catch (error) {
      throw error;
    }
  }
}
