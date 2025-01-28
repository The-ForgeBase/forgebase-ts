import { User, AuthProvider } from '../../types';
import { KnexUserService } from '../../userService';

abstract class BaseOAuthProvider<TUser extends User>
  implements AuthProvider<TUser>
{
  constructor(
    private config: {
      clientID: string;
      clientSecret: string;
      callbackURL: string;
      userService: KnexUserService<TUser>;
    }
  ) {}

  abstract getAuthorizationUrl(): string;
  abstract exchangeCode(code: string): Promise<{ accessToken: string }>;
  abstract getUserProfile(accessToken: string): Promise<Partial<TUser>>;

  async authenticate({ code }: { code: string }): Promise<TUser> {
    const { accessToken } = await this.exchangeCode(code);
    const profile = await this.getUserProfile(accessToken);

    let user = await this.config.userService.findUser(profile.email);
    if (!user) {
      // Use webcrypto API for generating random bytes
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const password = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      user = await this.config.userService.createUser(
        {
          ...profile,
          email: profile.email,
        },
        password
      );
    }

    return user;
  }
}

export class GoogleOAuthProvider<
  TUser extends User
> extends BaseOAuthProvider<TUser> {
  getAuthorizationUrl(): string {
    throw new Error('Method not implemented.');
  }
  exchangeCode(code: string): Promise<{ accessToken: string }> {
    throw new Error('Method not implemented.');
  }
  getUserProfile(accessToken: string): Promise<Partial<TUser>> {
    throw new Error('Method not implemented.');
  }
  // Implement Google-specific OAuth2 flow
}
