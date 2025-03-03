import { AuthPlugin } from './types';
import { AuthProvider, User } from '../types';

export class PluginRegistry<TUser extends User = User> {
  private plugins: Map<string, AuthPlugin<TUser>> = new Map();

  async register(plugin: AuthPlugin<TUser>): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin with name ${plugin.name} is already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  getPlugin(name: string): AuthPlugin<TUser> | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): AuthPlugin<TUser>[] {
    return Array.from(this.plugins.values());
  }

  getAllProviders(): Record<string, AuthProvider<TUser>> {
    const providers: Record<string, AuthProvider<TUser>> = {};

    for (const plugin of this.plugins.values()) {
      const pluginProviders = plugin.getProviders();
      Object.assign(providers, pluginProviders);
    }

    return providers;
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
