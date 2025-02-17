import { BaseProvider } from './factory';
import { z } from 'zod';
import { AuthError, AUTH_ERROR_CODES } from '../lib/errors';

export const oauthConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  callbackUrl: z.string().url(),
  scope: z.array(z.string()).default([]),
  authorizationUrl: z.string().url(),
  tokenUrl: z.string().url(),
  userInfoUrl: z.string().url().optional(),
});

export type OAuthConfig = z.infer<typeof oauthConfigSchema>;

export abstract class OAuthProvider extends BaseProvider {
  abstract type: string;
  protected oauthConfig!: OAuthConfig;

  async validateConfig(config: unknown): Promise<void> {
    try {
      this.oauthConfig = oauthConfigSchema.parse(config);
    } catch (error) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `Invalid OAuth configuration: ${(error as Error).message}`,
        400,
        error as Error
      );
    }
  }

  protected abstract getUserProfile(
    accessToken: string
  ): Promise<{ id: string; [key: string]: any }>;

  async authenticate(credentials: {
    code: string;
  }): Promise<{ id: string; [key: string]: any }> {
    const tokens = await this.exchangeCodeForTokens(credentials.code);
    return this.getUserProfile(tokens.access_token);
  }

  protected async exchangeCodeForTokens(
    code: string
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      redirect_uri: this.oauthConfig.callbackUrl,
    });

    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        `OAuth token exchange failed: ${response.statusText}`,
        401
      );
    }

    return response.json();
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.callbackUrl,
      scope: this.oauthConfig.scope.join(' '),
      state,
    });

    return `${this.oauthConfig.authorizationUrl}?${params.toString()}`;
  }
}

export class GoogleOAuthProvider extends OAuthProvider {
  type = 'google';

  protected async getUserProfile(
    accessToken: string
  ): Promise<{ id: string; [key: string]: any }> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        'Failed to fetch user profile',
        401
      );
    }

    const data = await response.json();
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }
}
