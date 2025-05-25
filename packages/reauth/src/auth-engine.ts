import {
  createContainer,
  InjectionMode,
  AwilixContainer,
  asValue,
} from 'awilix';
import { createHookRegisterer, executeStep } from './plugins/utils';
import type {
  AuthInput,
  AuthOutput,
  AuthPlugin,
  EntityService,
  HooksType,
  MigrationConfig,
  ReAuthCradle,
  SessionService,
  SensitiveFields,
  Entity,
} from './types';
import { PluginNotFound, StepNotFound } from './types';

export class ReAuthEngine {
  private container: AwilixContainer<ReAuthCradle>;
  private plugins: AuthPlugin[] = [];
  private migrationConfig: MigrationConfig;
  private sensitiveFields: SensitiveFields = {};

  constructor(config: {
    plugins: AuthPlugin[];
    entity: EntityService;
    session: SessionService;
  }) {
    this.container = createContainer<ReAuthCradle>({
      injectionMode: InjectionMode.CLASSIC,
      strict: true,
    });

    // Register core services and sensitive fields handling
    this.container.register({
      entityService: asValue(config.entity),
      sessionService: asValue(config.session),
      sensitiveFields: asValue(this.sensitiveFields),
      serializeEntity: asValue(this.serializeEntity.bind(this)),
    });

    config.plugins.forEach((plugin) => this.registerPlugin(plugin));

    this.migrationConfig = {
      migrationName: 'reauth',
      outputDir: 'migrations',
      baseTables: [
        {
          tableName: 'entities',
          columns: {
            id: {
              type: 'uuid',
              primary: true,
              nullable: false,
              unique: true,
              defaultValue: 'uuid',
            },
            role: {
              type: 'string',
              nullable: false,
              defaultValue: 'user',
            },
          },
          timestamps: true,
        },
        {
          tableName: 'sessions',
          columns: {
            id: {
              type: 'uuid',
              primary: true,
              nullable: false,
              unique: true,
              defaultValue: 'uuid',
            },
            entity_id: {
              type: 'uuid',
              nullable: false,
            },
            token: {
              type: 'string',
              unique: true,
              nullable: false,
            },
            expires_at: {
              type: 'timestamp',
              nullable: true,
            },
          },
          timestamps: true,
        },
      ],
      plugins: config.plugins
        .map((plugin) => plugin.migrationConfig)
        .filter((config) => config !== undefined),
    };
  }

  getMirgrationCongfig(): MigrationConfig {
    return this.migrationConfig;
  }

  /**
   * Get a service from the DI container
   * @param name The name of the service to retrieve
   */
  getService<T extends keyof ReAuthCradle>(
    container: AwilixContainer<ReAuthCradle>,
    serviceName: T,
  ): ReAuthCradle[T] {
    return container.cradle[serviceName];
  }

  /**
   * Register an auth plugin
   * @param auth The auth plugin to register
   */
  private registerPlugin(plugin: AuthPlugin) {
    this.plugins.push(plugin);

    // Register plugin's sensitive fields if defined
    if (plugin.getSensitiveFields) {
      const fields = plugin.getSensitiveFields();
      if (fields && fields.length > 0) {
        this.sensitiveFields[plugin.name] = fields;
      }
    }
    plugin.initialize(this.container);
    return this;
  }

  /**
   * Serializes an entity by redacting sensitive fields
   * @param entity The entity to serialize
   * @returns A new object with sensitive fields redacted
   */
  private serializeEntity<T extends Entity>(entity: T): T {
    if (!entity) return entity;

    // Create a shallow copy of the entity
    const serialized = { ...entity } as Record<string, any>;

    // Get all sensitive fields from all plugins
    const allSensitiveFields = Object.values(this.sensitiveFields).flat();

    // Redact sensitive fields
    allSensitiveFields.forEach((field) => {
      if (field in serialized) {
        serialized[field] = '[REDACTED]';
      }
    });

    return serialized as T;
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
  getContainer(): AwilixContainer<ReAuthCradle> {
    return this.container;
  }

  executeStep(pluginName: string, stepName: string, input: AuthInput) {
    const plugin = this.getPlugin(pluginName);
    const step = plugin.steps.find((s) => s.name === stepName);
    if (!step) {
      throw new StepNotFound(stepName, pluginName);
    }

    if (plugin.runStep) return plugin.runStep(step.name, input, this.container);

    return executeStep(stepName, input, {
      pluginName,
      step,
      container: this.container,
      config: plugin.config,
    });
  }

  registerHook(
    pluginName: string,
    stepName: string,
    type: HooksType,
    fn: (
      data: AuthInput | AuthOutput,
      container: AwilixContainer<ReAuthCradle>,
      error?: Error,
    ) => Promise<AuthOutput | AuthInput | void>,
  ) {
    const plugin = this.getPlugin(pluginName);
    const step = plugin.steps.find((s) => s.name === stepName);
    if (!step) {
      throw new StepNotFound(stepName, pluginName);
    }

    if (step.registerHook) {
      step.registerHook(type, fn);

      return this;
    }

    if (!step.hooks) step.hooks = {};

    const register = createHookRegisterer(step.hooks);
    register(type, fn);
    return this;
  }

  getStepInputs(pluginName: string, stepName: string) {
    const plugin = this.getPlugin(pluginName);
    const step = plugin.steps.find((s) => s.name === stepName);
    if (!step) {
      throw new StepNotFound(stepName, pluginName);
    }
    return step.inputs;
  }
}

export const createReAuthEngine = (config: {
  plugins: AuthPlugin[];
  entity: EntityService;
  session: SessionService;
}): ReAuthEngine => {
  return new ReAuthEngine(config);
};

const test: Entity = {
  id: '1',
  role: 'user',
  created_at: new Date(),
  updated_at: new Date(),
  email: 'test@test.com',
  email_verified: false,
  password_hash: 'test',
};
