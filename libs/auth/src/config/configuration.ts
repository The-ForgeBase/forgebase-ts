import { z } from 'zod';
import deepmerge from 'deepmerge';
import type { SetRequired } from 'type-fest';

export const baseConfigSchema = z.object({
  providers: z.record(
    z.object({
      type: z.string(),
      enabled: z.boolean().default(true),
      config: z.record(z.any()).optional(),
    })
  ),
  session: z.object({
    storage: z.enum(['memory', 'redis', 'database']).default('memory'),
    ttl: z.number().default(86400), // 24 hours
    updateAge: z.number().default(3600), // 1 hour
  }),
  jwt: z
    .object({
      secret: z.string(),
      expiresIn: z.string().default('1d'),
    })
    .optional(),
});

export type AuthConfig = z.infer<typeof baseConfigSchema>;

export class ConfigurationManager {
  private config: AuthConfig;
  private listeners: Set<(config: AuthConfig) => void>;

  constructor(initialConfig: AuthConfig) {
    this.config = baseConfigSchema.parse(initialConfig);
    this.listeners = new Set();
  }

  getConfig(): Readonly<AuthConfig> {
    return Object.freeze({ ...this.config });
  }

  async updateConfig(partialConfig: Partial<AuthConfig>): Promise<void> {
    const newConfig = deepmerge(this.config, partialConfig);
    const validated = baseConfigSchema.parse(newConfig);
    this.config = validated;
    this.notifyListeners();
  }

  onConfigChange(listener: (config: AuthConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach((listener) => listener(config));
  }
}
