export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  timestamp: number;
  version: string;
  uptime: number;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: number;
  metrics?: Record<string, number>;
}

export class HealthMonitor {
  private startTime: number;
  private components = new Map<string, ComponentHealth>();
  private checkInterval?: NodeJS.Timer;
  private healthChecks = new Map<string, () => Promise<ComponentHealth>>();

  constructor(
    private options: {
      checkIntervalMs?: number;
      version: string;
    }
  ) {
    this.startTime = Date.now();
    this.options.checkIntervalMs = options.checkIntervalMs || 30000; // 30s default
  }

  registerHealthCheck(
    component: string,
    check: () => Promise<ComponentHealth>
  ): void {
    this.healthChecks.set(component, check);
  }

  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(
      () => this.runHealthChecks(),
      this.options.checkIntervalMs
    );

    // Run initial health check
    this.runHealthChecks();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private async runHealthChecks(): Promise<void> {
    for (const [component, check] of this.healthChecks.entries()) {
      try {
        const health = await check();
        this.components.set(component, health);
      } catch (error) {
        this.components.set(component, {
          status: 'unhealthy',
          message: error.message,
          lastCheck: Date.now(),
        });
      }
    }
  }

  getStatus(): HealthStatus {
    const components = Object.fromEntries(this.components.entries());
    const componentStatuses = Object.values(components).map((c) => c.status);

    let status: HealthStatus['status'] = 'healthy';
    if (componentStatuses.includes('unhealthy')) {
      status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      status = 'degraded';
    }

    return {
      status,
      components,
      timestamp: Date.now(),
      version: this.options.version,
      uptime: Date.now() - this.startTime,
    };
  }

  getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {
      uptime: Date.now() - this.startTime,
      componentCount: this.components.size,
      healthyComponents: 0,
      degradedComponents: 0,
      unhealthyComponents: 0,
    };

    for (const component of this.components.values()) {
      metrics[`${component.status}Components`]++;
      if (component.metrics) {
        Object.entries(component.metrics).forEach(([key, value]) => {
          metrics[`${key}`] = (metrics[`${key}`] || 0) + value;
        });
      }
    }

    return metrics;
  }
}

// Common health checks
export const commonHealthChecks = {
  memory: async (): Promise<ComponentHealth> => {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      status: heapUsedPercent > 90 ? 'degraded' : 'healthy',
      message: `Heap usage: ${heapUsedPercent.toFixed(1)}%`,
      lastCheck: Date.now(),
      metrics: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
      },
    };
  },

  providers: (providerRegistry: any): (() => Promise<ComponentHealth>) => {
    return async () => {
      const providers = providerRegistry.getEnabledProviders();
      return {
        status: providers.length > 0 ? 'healthy' : 'degraded',
        message: `${providers.length} active providers`,
        lastCheck: Date.now(),
        metrics: {
          activeProviders: providers.length,
        },
      };
    };
  },
};
