import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import {
  HlmCardContentDirective,
  HlmCardDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
  HlmCardDescriptionDirective,
} from '@spartan-ng/ui-card-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { DatabaseService } from '../../../services/database.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmButtonDirective,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardDescriptionDirective,
    HlmCardContentDirective,
    HlmInputDirective,
    HlmLabelDirective,
    ToastModule,
    ButtonModule,
  ],
  providers: [MessageService],
  template: `
    <div class="container mx-auto p-6 max-w-[1200px] space-y-6">
      <h1 class="text-2xl font-bold tracking-tight mb-4">Database Settings</h1>

      <!-- Connection Settings -->
      <div hlmCard>
        <div hlmCardHeader>
          <h3 hlmCardTitle>Connection Settings</h3>
          <p hlmCardDescription>
            Configure your database connection parameters
          </p>
        </div>
        <div hlmCardContent>
          <form class="space-y-4" (ngSubmit)="saveConnectionSettings()">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <label hlmLabel>Host</label>
                <input
                  hlmInput
                  type="text"
                  [(ngModel)]="connectionSettings.host"
                  name="host"
                  placeholder="localhost"
                />
              </div>
              <div class="space-y-2">
                <label hlmLabel>Port</label>
                <input
                  [(ngModel)]="connectionSettings.port"
                  name="port"
                  hlmInput
                  type="number"
                />
              </div>
              <div class="space-y-2">
                <label hlmLabel>Database Name</label>
                <input
                  hlmInput
                  type="text"
                  [(ngModel)]="connectionSettings.database"
                  name="database"
                />
              </div>
              <div class="space-y-2">
                <label hlmLabel>Schema</label>
                <input
                  hlmInput
                  type="text"
                  [(ngModel)]="connectionSettings.schema"
                  name="schema"
                  placeholder="public"
                />
              </div>
            </div>
            <div class="pt-4 flex justify-end gap-3">
              <button
                hlmBtn
                variant="outline"
                type="button"
                (click)="testConnection()"
              >
                Test Connection
              </button>
              <button hlmBtn type="submit">Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Database Statistics -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div hlmCard>
          <div hlmCardHeader>
            <h3 hlmCardTitle>Database Size</h3>
          </div>
          <div hlmCardContent>
            <p class="text-3xl font-bold">{{ formatSize(databaseSize()) }}</p>
            <p class="text-sm text-muted-foreground">Total database size</p>
          </div>
        </div>

        <div hlmCard>
          <div hlmCardHeader>
            <h3 hlmCardTitle>Tables</h3>
          </div>
          <div hlmCardContent>
            <p class="text-3xl font-bold">{{ tables().length }}</p>
            <p class="text-sm text-muted-foreground">Total number of tables</p>
          </div>
        </div>

        <div hlmCard>
          <div hlmCardHeader>
            <h3 hlmCardTitle>Active Connections</h3>
          </div>
          <div hlmCardContent>
            <p class="text-3xl font-bold">{{ activeConnections() }}</p>
            <p class="text-sm text-muted-foreground">
              Current active connections
            </p>
          </div>
        </div>
      </div>

      <!-- Backup & Maintenance -->
      <div hlmCard>
        <div hlmCardHeader>
          <h3 hlmCardTitle>Backup & Maintenance</h3>
          <p hlmCardDescription>
            Manage database backups and maintenance tasks
          </p>
        </div>
        <div hlmCardContent>
          <div class="space-y-4">
            <div class="flex items-center justify-between py-2">
              <div>
                <h4 class="font-medium">Automatic Backups</h4>
                <p class="text-sm text-muted-foreground">
                  Configure automated backup schedule
                </p>
              </div>
              <button hlmBtn variant="outline">Configure</button>
            </div>

            <div class="flex items-center justify-between py-2">
              <div>
                <h4 class="font-medium">Manual Backup</h4>
                <p class="text-sm text-muted-foreground">
                  Create an immediate backup of your database
                </p>
              </div>
              <button
                hlmBtn
                variant="default"
                [disabled]="isBackingUp()"
                (click)="createBackup()"
              >
                {{ isBackingUp() ? 'Creating Backup...' : 'Create Backup' }}
              </button>
            </div>

            <div class="flex items-center justify-between py-2">
              <div>
                <h4 class="font-medium">Vacuum Database</h4>
                <p class="text-sm text-muted-foreground">
                  Clean up and optimize database storage
                </p>
              </div>
              <button
                hlmBtn
                variant="outline"
                [disabled]="isVacuuming()"
                (click)="vacuumDatabase()"
              >
                {{ isVacuuming() ? 'Optimizing...' : 'Optimize' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Security Settings -->
      <div hlmCard>
        <div hlmCardHeader>
          <h3 hlmCardTitle>Security Settings</h3>
          <p hlmCardDescription>Configure database security options</p>
        </div>
        <div hlmCardContent>
          <div class="space-y-4">
            <div class="flex items-center justify-between py-2">
              <div>
                <h4 class="font-medium">SSL Configuration</h4>
                <p class="text-sm text-muted-foreground">
                  Manage SSL certificates and encryption
                </p>
              </div>
              <button hlmBtn variant="outline">Configure SSL</button>
            </div>

            <div class="flex items-center justify-between py-2">
              <div>
                <h4 class="font-medium">Access Control</h4>
                <p class="text-sm text-muted-foreground">
                  Manage IP allowlist and access rules
                </p>
              </div>
              <button hlmBtn variant="outline">Manage Access</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p-toast position="top-right"></p-toast>
  `,
})
export default class DatabaseSettingsPage implements OnInit {
  private messageService = inject(MessageService);
  databaseService = inject(DatabaseService);

  // Signals for reactive state
  tables = signal<string[]>([]);
  databaseSize = signal<number>(0);
  activeConnections = signal<number>(0);
  isBackingUp = signal(false);
  isVacuuming = signal(false);

  // Connection settings form model
  connectionSettings = {
    host: 'localhost',
    port: 5432,
    database: '',
    schema: 'public',
  };

  ngOnInit(): void {
    this.tables.set(this.databaseService.getTables()());
    // Mock initial values - replace with actual API calls
    this.databaseSize.set(1024 * 1024 * 256); // 256MB
    this.activeConnections.set(5);
  }

  saveConnectionSettings(): void {
    // TODO: Implement actual save logic
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Connection settings saved successfully',
    });
  }

  testConnection(): void {
    // TODO: Implement actual connection test
    this.messageService.add({
      severity: 'info',
      summary: 'Testing',
      detail: 'Connection test successful',
    });
  }

  async createBackup(): Promise<void> {
    this.isBackingUp.set(true);
    try {
      // TODO: Implement actual backup logic
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Database backup created successfully',
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create backup',
      });
    } finally {
      this.isBackingUp.set(false);
    }
  }

  async vacuumDatabase(): Promise<void> {
    this.isVacuuming.set(true);
    try {
      // TODO: Implement actual vacuum logic
      await new Promise((resolve) => setTimeout(resolve, 3000));
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Database optimized successfully',
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to optimize database',
      });
    } finally {
      this.isVacuuming.set(false);
    }
  }

  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
