export interface AuthEvent {
  type: string;
  timestamp: number;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  provider?: string;
  status: 'success' | 'failure';
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

export interface MetricsCollector {
  recordEvent(event: AuthEvent): Promise<void>;
  getMetrics(options: {
    startTime: number;
    endTime: number;
    tenantId?: string;
  }): Promise<Record<string, number>>;
}

export class AnalyticsEngine {
  private collectors: MetricsCollector[] = [];
  private buffer: AuthEvent[] = [];
  private flushInterval: NodeJS.Timer;

  constructor(
    private options: {
      bufferSize?: number;
      flushIntervalMs?: number;
    } = {}
  ) {
    this.options.bufferSize = this.options.bufferSize || 100;
    this.options.flushIntervalMs = this.options.flushIntervalMs || 5000;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.options.flushIntervalMs);
  }

  addCollector(collector: MetricsCollector): void {
    this.collectors.push(collector);
  }

  async recordEvent(event: Omit<AuthEvent, 'timestamp'>): Promise<void> {
    const fullEvent: AuthEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.buffer.push(fullEvent);

    if (this.buffer.length >= (this.options.bufferSize || 100)) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    await Promise.all(
      this.collectors.map((collector) =>
        Promise.all(events.map((event) => collector.recordEvent(event)))
      )
    );
  }

  async getMetrics(options: {
    startTime: number;
    endTime: number;
    tenantId?: string;
  }): Promise<Record<string, number>[]> {
    await this.flush(); // Ensure all pending events are processed

    return Promise.all(
      this.collectors.map((collector) => collector.getMetrics(options))
    );
  }

  destroy(): void {
    clearInterval(this.flushInterval);
  }
}

// Memory-based metrics collector implementation
export class InMemoryMetricsCollector implements MetricsCollector {
  private events: AuthEvent[] = [];

  async recordEvent(event: AuthEvent): Promise<void> {
    this.events.push(event);

    // Keep only last 24 hours of events
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.events = this.events.filter((e) => e.timestamp > dayAgo);
  }

  async getMetrics(options: {
    startTime: number;
    endTime: number;
    tenantId?: string;
  }): Promise<Record<string, number>> {
    const filteredEvents = this.events.filter(
      (event) =>
        event.timestamp >= options.startTime &&
        event.timestamp <= options.endTime &&
        (!options.tenantId || event.tenantId === options.tenantId)
    );

    return {
      totalEvents: filteredEvents.length,
      successfulLogins: filteredEvents.filter(
        (e) => e.type === 'login' && e.status === 'success'
      ).length,
      failedLogins: filteredEvents.filter(
        (e) => e.type === 'login' && e.status === 'failure'
      ).length,
      uniqueUsers: new Set(filteredEvents.map((e) => e.userId).filter(Boolean))
        .size,
    };
  }
}
