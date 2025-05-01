import { BaseOAuthProvider } from '../../../providers';
import { DynamicAuthManager } from '../../../authManager';
import { AuthProvider, User } from '../../../types';
import { AuthPlugin } from '../../types';
import { VoiceAuthProvider } from './voice-auth-provider';
import { VoiceAuthService } from './voice-auth-service';

/**
 * Plugin for voice recognition authentication
 */
export class VoiceAuthPlugin implements AuthPlugin {
  name = 'voice-auth';
  version = '1.0.0';
  private voiceAuthService: VoiceAuthService;
  private provider: VoiceAuthProvider;

  constructor(options: {
    // Voice authentication configuration
    audioProcessingEndpoint?: string;
    minMatchConfidence?: number;
    voiceprintStorage: {
      saveVoiceprint: (userId: string, voiceprint: Buffer) => Promise<void>;
      getVoiceprint: (userId: string) => Promise<Buffer | null>;
    };
    userLookup: (identifier: string) => Promise<User | null>;
  }) {
    this.voiceAuthService = new VoiceAuthService(options);
    this.provider = new VoiceAuthProvider(
      this.voiceAuthService,
      options.userLookup
    );
  }

  async initialize(authManager: DynamicAuthManager): Promise<void> {
    console.log('Voice Recognition Authentication plugin initialized');
    // Any initialization logic - perhaps set up database tables or connections
  }

  getProvider(): Record<string, AuthProvider | BaseOAuthProvider> {
    return {
      voice: this.provider,
    };
  }

  getHooks() {
    return {
      beforeLogin: async (data: any) => {
        // Run before any login attempt with voice provider
        if (data.provider === 'voice') {
          console.log(
            'Voice authentication attempt for:',
            data.credentials.identifier
          );
        }
      },
      afterLogin: async (data: any) => {
        // Log successful voice authentication
        if (data.provider === 'voice' && data.user) {
          console.log(
            'Voice authentication successful for user:',
            data.user.id
          );
        }
      },
      afterRegister: async (data: any) => {
        if (data.user) {
          console.log('New voice profile registered for user:', data.user.id);
        }
      },
    };
  }

  async cleanup(): Promise<void> {
    // Clean up any resources used by the plugin
    await this.voiceAuthService.close();
  }
}
