import { AuthProvider, User } from '../../../types';
import { VoiceAuthService } from './voice-auth-service';

export class VoiceAuthProvider implements AuthProvider {
  constructor(
    private voiceAuthService: VoiceAuthService,
    private userLookup: (identifier: string) => Promise<User | null>
  ) {}

  async authenticate(credentials: {
    identifier: string; // Email or username
    audioData: string; // Base64 encoded audio data
  }): Promise<User | null> {
    try {
      // 1. Find user by identifier
      const user = await this.userLookup(credentials.identifier);
      if (!user) return null;

      // 2. Verify the voice against stored voiceprint
      const isValid = await this.voiceAuthService.verifyVoice(
        user.id,
        Buffer.from(credentials.audioData, 'base64')
      );

      if (!isValid) return null;

      // Voice verification passed
      return user;
    } catch (error) {
      console.error('Voice authentication error:', error);
      return null;
    }
  }

  async register(partialUser: Partial<User>, voiceData: string): Promise<User> {
    // 1. Create user account first (typically delegated to another provider)
    // This is just a placeholder - in a real implementation, you would:
    // - Create the user with a base provider first
    // - Then add voice data to the user
    if (!partialUser.id) {
      throw new Error(
        'User must be created first before registering voice authentication'
      );
    }

    // 2. Process and store the voice profile
    await this.voiceAuthService.registerVoice(
      partialUser.id,
      Buffer.from(voiceData, 'base64')
    );

    // Return the existing user
    const user = await this.userLookup(partialUser.id);
    if (!user) {
      throw new Error('User not found after voice registration');
    }

    return user;
  }
}
