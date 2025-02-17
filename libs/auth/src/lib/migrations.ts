export interface Migration {
  version: string;
  description: string;
  up: (context: MigrationContext) => Promise<void>;
  down: (context: MigrationContext) => Promise<void>;
}

export interface MigrationContext {
  tenantId?: string;
  storage: any;
  config: Record<string, any>;
}

export interface MigrationStatus {
  version: string;
  appliedAt: number;
  status: 'success' | 'failed';
  error?: string;
}

export class MigrationManager {
  private migrations = new Map<string, Migration>();
  private sortedVersions: string[] = [];

  registerMigration(migration: Migration): void {
    this.migrations.set(migration.version, migration);
    this.sortedVersions = Array.from(this.migrations.keys()).sort((a, b) =>
      this.compareVersions(a, b)
    );
  }

  async getCurrentVersion(context: MigrationContext): Promise<string> {
    const status = await this.getMigrationStatus(context);
    return status.length > 0 ? status[status.length - 1].version : '0.0.0';
  }

  async migrate(
    targetVersion: string,
    context: MigrationContext
  ): Promise<void> {
    const currentVersion = await this.getCurrentVersion(context);

    if (this.compareVersions(currentVersion, targetVersion) === 0) {
      return; // Already at target version
    }

    const isUpgrade = this.compareVersions(targetVersion, currentVersion) > 0;
    const migrationVersions = this.getMigrationVersions(
      currentVersion,
      targetVersion
    );

    if (isUpgrade) {
      // Apply migrations in ascending order
      for (const version of migrationVersions) {
        await this.applyMigration(version, 'up', context);
      }
    } else {
      // Apply migrations in descending order
      for (const version of migrationVersions.reverse()) {
        await this.applyMigration(version, 'down', context);
      }
    }
  }

  private async applyMigration(
    version: string,
    direction: 'up' | 'down',
    context: MigrationContext
  ): Promise<void> {
    const migration = this.migrations.get(version);
    if (!migration) {
      throw new Error(`Migration version ${version} not found`);
    }

    try {
      await migration[direction](context);
      await this.recordMigration(version, 'success', context);
    } catch (error) {
      await this.recordMigration(version, 'failed', context, error.message);
      throw error;
    }
  }

  private async recordMigration(
    version: string,
    status: 'success' | 'failed',
    context: MigrationContext,
    error?: string
  ): Promise<void> {
    const migrationStatus: MigrationStatus = {
      version,
      appliedAt: Date.now(),
      status,
      error,
    };

    // Store migration status in the provided storage
    await context.storage.recordMigration(migrationStatus);
  }

  private async getMigrationStatus(
    context: MigrationContext
  ): Promise<MigrationStatus[]> {
    return context.storage.getMigrationStatus();
  }

  private getMigrationVersions(
    fromVersion: string,
    toVersion: string
  ): string[] {
    const isUpgrade = this.compareVersions(toVersion, fromVersion) > 0;
    const versions = this.sortedVersions.filter((version) => {
      const compareFrom = this.compareVersions(version, fromVersion);
      const compareTo = this.compareVersions(version, toVersion);
      return isUpgrade
        ? compareFrom > 0 && compareTo <= 0
        : compareFrom <= 0 && compareTo > 0;
    });

    return versions;
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      if (partA !== partB) {
        return partA - partB;
      }
    }

    return 0;
  }
}

// Example migrations
export const createExampleMigrations = (): Migration[] => [
  {
    version: '1.0.0',
    description: 'Initial schema setup',
    up: async (context) => {
      // Initialize basic schema
    },
    down: async (context) => {
      // Revert schema changes
    },
  },
  {
    version: '1.1.0',
    description: 'Add support for multiple auth providers',
    up: async (context) => {
      // Add provider-related schema changes
    },
    down: async (context) => {
      // Revert provider-related changes
    },
  },
  {
    version: '1.2.0',
    description: 'Add multi-tenant support',
    up: async (context) => {
      // Add tenant-related schema changes
    },
    down: async (context) => {
      // Revert tenant-related changes
    },
  },
];
