import { AuthFrameworkAdapter } from '../adapters/framework';
import { AuthService } from '../lib/service';
import { providerRegistry } from '../providers/registry';
import { storageRegistry } from '../session/registry';
import { pluginManager } from '../lib/plugins';
import { AuthError, AUTH_ERROR_CODES } from '../lib/errors';

export class AuthConfigAPI {
  constructor(
    private adapter: AuthFrameworkAdapter,
    private authService: AuthService
  ) {}

  async handleRequest(req: unknown, res: unknown): Promise<void> {
    const { method, path, body } = await this.adapter.getRequestData(req);

    try {
      let result: any;

      switch (`${method} ${path}`) {
        case 'PUT /config':
          result = await this.updateConfig(body);
          break;

        case 'POST /providers':
          result = await this.addProvider(body);
          break;

        case 'DELETE /providers/:type':
          const type = path.split('/').pop();
          result = await this.removeProvider(type);
          break;

        case 'PUT /storage':
          result = await this.configureStorage(body);
          break;

        case 'POST /plugins':
          result = await this.registerPlugin(body);
          break;

        default:
          throw new AuthError(
            AUTH_ERROR_CODES.INVALID_REQUEST,
            'Invalid endpoint',
            404
          );
      }

      await this.adapter.setResponseData(res, {
        status: 200,
        body: { success: true, data: result },
      });
    } catch (error) {
      const status = error instanceof AuthError ? error.statusCode : 500;
      await this.adapter.setResponseData(res, {
        status,
        body: {
          success: false,
          error: error.message,
        },
      });
    }
  }

  private async updateConfig(config: any): Promise<void> {
    await this.authService.updateConfig(config);
  }

  private async addProvider(config: {
    type: string;
    config: any;
  }): Promise<void> {
    await providerRegistry.configureProvider(config.type, config.config);
  }

  private async removeProvider(type: string): Promise<void> {
    await providerRegistry.removeProvider(type);
  }

  private async configureStorage(config: {
    type: string;
    options?: any;
  }): Promise<void> {
    await storageRegistry.useStorage(config.type, config.options);
  }

  private async registerPlugin(plugin: any): Promise<void> {
    await pluginManager.registerPlugin(plugin);
  }
}
