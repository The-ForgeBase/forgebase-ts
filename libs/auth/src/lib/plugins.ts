export interface AuthPlugin {
  name: string;
  version: string;
  onInit?: () => Promise<void>;
  onConfigChange?: (config: any) => Promise<void>;
  onAuthenticate?: (userId: string, data: any) => Promise<void>;
  onSignOut?: (userId: string) => Promise<void>;
  cleanup?: () => Promise<void>;
}

export class PluginManager {
  private plugins: Map<string, AuthPlugin> = new Map();

  async registerPlugin(plugin: AuthPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    await plugin.onInit?.();
  }

  async unregisterPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      await plugin.cleanup?.();
      this.plugins.delete(name);
    }
  }

  async notifyPlugins(event: 'onConfigChange', config: any): Promise<void>;
  async notifyPlugins(
    event: 'onAuthenticate',
    userId: string,
    data: any
  ): Promise<void>;
  async notifyPlugins(event: 'onSignOut', userId: string): Promise<void>;
  async notifyPlugins(
    event: 'onConfigChange' | 'onAuthenticate' | 'onSignOut',
    ...args: any[]
  ): Promise<void> {
    switch (event) {
      case 'onConfigChange':
        await Promise.all(
          Array.from(this.plugins.values())
            .map((plugin) => plugin.onConfigChange?.(args[0]))
            .filter(Boolean)
        );
        break;
      case 'onAuthenticate':
        await Promise.all(
          Array.from(this.plugins.values())
            .map((plugin) => plugin.onAuthenticate?.(args[0], args[1]))
            .filter(Boolean)
        );
        break;
      case 'onSignOut':
        await Promise.all(
          Array.from(this.plugins.values())
            .map((plugin) => plugin.onSignOut?.(args[0]))
            .filter(Boolean)
        );
        break;
    }
  }

  getPlugin(name: string): AuthPlugin | undefined {
    return this.plugins.get(name);
  }
}

export const pluginManager = new PluginManager();
