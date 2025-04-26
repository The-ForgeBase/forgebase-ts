import { AuthProvider, User } from '../../../types';
import { MagicLinkPlugin } from './index';

export class MagicLinkProvider implements AuthProvider {
  constructor(private plugin: MagicLinkPlugin) {}

  async authenticate(credentials: {
    email?: string;
    token?: string;
  }): Promise<User | null> {
    // If token is provided, verify it
    if (credentials.token) {
      return await this.plugin.verifyMagicLink(credentials.token);
    }

    // If email is provided, generate a magic link (initiate the flow)
    if (credentials.email) {
      await this.plugin.generateMagicLink(credentials.email);
      // Return null because user isn't authenticated yet - they need to check email
      return null;
    }

    return null;
  }

  // Magic link doesn't need traditional registration - it uses existing users
  async register?(credentials: Partial<User>, password: string): Promise<User> {
    throw new Error(
      'Direct registration not supported with magic links. Register with another method first.'
    );
  }

  // Validate a token from URL
  async validate?(token: string): Promise<User | null> {
    return await this.plugin.verifyMagicLink(token);
  }
}
