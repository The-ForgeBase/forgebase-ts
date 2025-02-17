import { z } from 'zod';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  eventType: string;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  resourceType: string;
  resourceId: string;
  action: string;
  status: 'success' | 'failure';
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  startTime?: number;
  endTime?: number;
  tenantId?: string;
  userId?: string;
  eventType?: string;
  resourceType?: string;
  action?: string;
}

export interface AuditLogStorage {
  write(entry: AuditLogEntry): Promise<void>;
  query(filter: AuditLogFilter): Promise<AuditLogEntry[]>;
  export(filter: AuditLogFilter, format: 'json' | 'csv'): Promise<string>;
}

export class AuditLogger {
  private storage: AuditLogStorage;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: any;

  constructor(
    storage: AuditLogStorage,
    private options: {
      bufferSize?: number;
      flushIntervalMs?: number;
      includeSensitiveData?: boolean;
    } = {}
  ) {
    this.storage = storage;
    this.options.bufferSize = options.bufferSize || 100;
    this.options.flushIntervalMs = options.flushIntervalMs || 5000;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.options.flushIntervalMs);
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      metadata: this.sanitizeMetadata(entry.metadata),
    };

    this.buffer.push(fullEntry);

    if (this.buffer.length >= (this.options.bufferSize || 100)) {
      await this.flush();
    }
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    if (!this.options.includeSensitiveData) {
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      return Object.fromEntries(
        Object.entries(metadata).filter(
          ([key]) =>
            !sensitiveFields.some((field) => key.toLowerCase().includes(field))
        )
      );
    }
    return metadata;
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    await Promise.all(entries.map((entry) => this.storage.write(entry)));
  }

  async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    await this.flush(); // Ensure all pending entries are written
    return this.storage.query(filter);
  }

  async export(
    filter: AuditLogFilter,
    format: 'json' | 'csv'
  ): Promise<string> {
    await this.flush();
    return this.storage.export(filter, format);
  }

  destroy(): void {
    clearInterval(this.flushInterval);
  }
}

// Memory-based audit log storage implementation
export class InMemoryAuditLogStorage implements AuditLogStorage {
  private entries: AuditLogEntry[] = [];

  async write(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);

    // Keep only last 30 days of logs in memory
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.entries = this.entries.filter((e) => e.timestamp > thirtyDaysAgo);
  }

  async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    return this.entries.filter((entry) => {
      if (filter.startTime && entry.timestamp < filter.startTime) return false;
      if (filter.endTime && entry.timestamp > filter.endTime) return false;
      if (filter.tenantId && entry.tenantId !== filter.tenantId) return false;
      if (filter.userId && entry.userId !== filter.userId) return false;
      if (filter.eventType && entry.eventType !== filter.eventType)
        return false;
      if (filter.resourceType && entry.resourceType !== filter.resourceType)
        return false;
      if (filter.action && entry.action !== filter.action) return false;
      return true;
    });
  }

  async export(
    filter: AuditLogFilter,
    format: 'json' | 'csv'
  ): Promise<string> {
    const entries = await this.query(filter);

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else {
      const headers = [
        'id',
        'timestamp',
        'eventType',
        'tenantId',
        'userId',
        'resourceType',
        'resourceId',
        'action',
        'status',
      ];

      const rows = entries.map((entry) =>
        headers
          .map((header) => entry[header as keyof AuditLogEntry] || '')
          .join(',')
      );

      return [headers.join(','), ...rows].join('\n');
    }
  }
}
