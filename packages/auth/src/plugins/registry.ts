import { AuthPlugin } from './types.js';
import { AuthProvider } from '../types.js';
import { BaseOAuthProvider } from '../providers/oauth/index.js';

export class PluginRegistry {
  private plugins: Map<string, AuthPlugin> = new Map();

  async register(plugin: AuthPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin with name ${plugin.name} is already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  getPlugin(name: string): AuthPlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): AuthPlugin[] {
    return Array.from(this.plugins.values());
  }

  getAllProviders(): Record<string, AuthProvider | BaseOAuthProvider> {
    const providers: Record<string, AuthProvider | BaseOAuthProvider> = {};

    for (const plugin of this.plugins.values()) {
      const pluginProviders = plugin.getProvider();
      Object.assign(providers, pluginProviders);
    }

    return providers;
  }

  getProvider(name: string): Record<string, AuthProvider | BaseOAuthProvider> {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      throw new Error(`Plugin with name ${name} is not registered`);
    }

    return plugin.getProvider();
  }

  getHooks(event: string): Array<(data: any) => Promise<void>> {
    const hooks: Array<(data: any) => Promise<void>> = [];

    for (const plugin of this.plugins.values()) {
      const pluginHooks = plugin.getHooks?.() || {};
      if (pluginHooks[event]) {
        hooks.push(pluginHooks[event]);
      }
    }

    return hooks;
  }

  async cleanup(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.cleanup) {
        await plugin.cleanup();
      }
    }
  }
}
