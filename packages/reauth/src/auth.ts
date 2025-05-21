import {
  AuthInput,
  AuthPlugin,
  PluginNotFound,
  ReAuthCradle,
  StepNotFound,
} from './types';
import {
  createContainer,
  InjectionMode,
  AwilixContainer,
  asValue,
  asClass,
  asFunction,
} from 'awilix';

export class ReAuth {
  private container: AwilixContainer<ReAuthCradle>;
  private plugins: AuthPlugin[] = [];

  constructor(
    initialPlugins: AuthPlugin[] = [],
    container?: AwilixContainer<ReAuthCradle>,
  ) {
    this.container =
      container ||
      createContainer<ReAuthCradle>({
        injectionMode: InjectionMode.CLASSIC,
        strict: true,
      });

    this.container.register({
      reAuth: asValue(this),
    });

    initialPlugins.forEach((plugin) => this.registerPlugin(plugin));
  }

  /**
   * Register a service in the DI container
   * @param name The name to register the service under
   * @param service The service to register (can be a class, function, or value)
   */
  registerService(name: string, service: any) {
    if (
      typeof service === 'function' &&
      service.prototype &&
      service.prototype.constructor === service
    ) {
      // It's a class
      this.container.register({
        [name]: asClass(service).singleton(),
      });
    } else if (typeof service === 'function') {
      // It's a function
      this.container.register({
        [name]: asFunction(service).singleton(),
      });
    } else {
      // It's a value
      this.container.register({
        [name]: asValue(service),
      });
    }
    return this;
  }

  /**
   * Get a service from the DI container
   * @param name The name of the service to retrieve
   */
  getService<T = any>(name: string): T {
    return this.container.resolve<T>(name);
  }

  /**
   * Register an auth plugin
   * @param auth The auth plugin to register
   */
  registerPlugin(auth: AuthPlugin) {
    this.plugins.push(auth);
    auth.initialize(this.container);
    return this;
  }

  /**
   * Get a plugin by name
   * @param name The name of the plugin to retrieve
   */
  getPlugin(name: string) {
    const plugin = this.plugins.find((p) => p.name === name);
    if (!plugin) {
      throw new PluginNotFound(name);
    }
    return plugin;
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins() {
    return this.plugins;
  }

  /**
   * Get the DI container
   */
  getContainer() {
    return this.container;
  }

  executeStep(pluginName: string, stepName: string, input: AuthInput) {
    const plugin = this.getPlugin(pluginName);
    const step = plugin.steps.find((s) => s.name === stepName);
    if (!step) {
      throw new StepNotFound(stepName, pluginName);
    }
    return step.run(input);
  }
}
