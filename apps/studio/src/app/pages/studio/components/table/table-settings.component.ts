import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  signal,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ColumnType,
  TableSchema,
  TableItem,
} from '../../../../shared/types/database';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { SelectModule } from 'primeng/select';
import { HlmCheckboxComponent } from '@spartan-ng/ui-checkbox-helm';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';
import { DatabaseService } from '../../../../services/database.service';

@Component({
  selector: 'studio-table-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmButtonModule,
    HlmInputDirective,
    HlmLabelDirective,
    SelectModule,
    HlmCheckboxComponent,
    HlmSelectImports,
    BrnSelectImports,
  ],
  template: `
    <div class="space-y-6 px-1">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium">General Settings</h4>
        </div>
        <div class="rounded-lg border bg-card p-4 space-y-4">
          <div class="grid gap-2">
            <label class="text-sm font-medium" for="tableName" hlmLabel>
              Table Name
            </label>
            <input
              id="tableName"
              type="text"
              hlmInput
              [(ngModel)]="localSchema().name"
              placeholder="Enter table name"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium">Columns</h4>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            (click)="addNewColumn()"
            type="button"
          >
            Add Column
          </button>
        </div>
        <div class="rounded-lg border bg-card">
          @for (column of localSchema().info.columns; track column.name; let i =
          $index) {
          <div class="p-4" [class.border-t]="i > 0">
            <div class="grid gap-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <label
                    class="text-sm font-medium"
                    [for]="'colName' + i"
                    hlmLabel
                  >
                    Column Name
                  </label>
                  <input
                    [id]="'colName' + i"
                    type="text"
                    hlmInput
                    [(ngModel)]="column.name"
                    placeholder="Enter column name"
                    class="w-full"
                  />
                </div>
                <div class="grid gap-2">
                  <label
                    class="text-sm font-medium"
                    [for]="'colType' + i"
                    hlmLabel
                  >
                    Data Type
                  </label>
                  <brn-select
                    [id]="'colType' + i"
                    [(ngModel)]="column.data_type"
                    placeholder="Select data type"
                  >
                    <hlm-select-trigger class="w-full">
                      <hlm-select-value />
                    </hlm-select-trigger>
                    <hlm-select-content>
                      @for (table of columnTypes(); track $index) {
                      <hlm-option [value]="table">{{ table }}</hlm-option>
                      }
                    </hlm-select-content>
                  </brn-select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <label
                    class="text-sm font-medium"
                    [for]="'colDefault' + i"
                    hlmLabel
                  >
                    Default Value
                  </label>
                  <input
                    [id]="'colDefault' + i"
                    type="text"
                    hlmInput
                    [(ngModel)]="column.default_value"
                    placeholder="Enter default value"
                    class="w-full"
                  />
                </div>
                <div class="grid gap-2">
                  <label
                    class="text-sm font-medium"
                    [for]="'colMaxLen' + i"
                    hlmLabel
                  >
                    Max Length
                  </label>
                  <input
                    [id]="'colMaxLen' + i"
                    type="number"
                    hlmInput
                    [(ngModel)]="column.max_length"
                    placeholder="Enter max length"
                    class="w-full"
                  />
                </div>
              </div>

              <div class="flex flex-wrap gap-4">
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox
                    [attr.aria-checked]="column.is_primary_key"
                    [attr.data-state]="
                      column.is_primary_key ? 'checked' : 'unchecked'
                    "
                    (click)="onPrimaryKeyChange(column)"
                    [checked]="column.is_primary_key"
                  />
                  <span class="text-sm">Primary Key</span>
                </label>
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox
                    [attr.aria-checked]="column.is_unique"
                    [attr.data-state]="
                      column.is_unique ? 'checked' : 'unchecked'
                    "
                    (click)="column.is_unique = !column.is_unique"
                    [checked]="column.is_unique"
                  />
                  <span class="text-sm">Unique</span>
                </label>
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox
                    [attr.aria-checked]="column.is_nullable"
                    [attr.data-state]="
                      column.is_nullable ? 'checked' : 'unchecked'
                    "
                    (click)="column.is_nullable = !column.is_nullable"
                    [checked]="column.is_nullable"
                  />
                  <span class="text-sm">Nullable</span>
                </label>
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox
                    [attr.aria-checked]="column.has_auto_increment"
                    [attr.data-state]="
                      column.has_auto_increment ? 'checked' : 'unchecked'
                    "
                    (click)="
                      column.has_auto_increment = !column.has_auto_increment
                    "
                    [checked]="column.has_auto_increment"
                  />
                  <span class="text-sm">Auto Increment</span>
                </label>
                @if (column.data_type !== 'json' && !column.is_primary_key) {
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox
                    [attr.aria-checked]="column.foreign_key_table !== null"
                    [attr.data-state]="
                      column.foreign_key_table !== null
                        ? 'checked'
                        : 'unchecked'
                    "
                    (click)="toggleForeignKey(column)"
                    [checked]="column.foreign_key_table !== null"
                    [disabled]="column.is_primary_key"
                  />
                  <span class="text-sm">Foreign Key</span>
                </label>
                }
              </div>

              @if (column.foreign_key_table !== null && (column.data_type !==
              'json' && !column.is_primary_key)) {
              <div class="grid gap-4">
                <div class="grid grid-cols-2 gap-4">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium" hlmLabel
                      >Reference Table</label
                    >
                    <brn-select
                      [(ngModel)]="column.foreign_key_table"
                      placeholder="Select table"
                      (valueChange)="onTableSelect($event, column)"
                    >
                      <hlm-select-trigger class="w-full">
                        <hlm-select-value />
                      </hlm-select-trigger>
                      <hlm-select-content>
                        <hlm-select-label>Reference Table</hlm-select-label>
                        @for (table of availableTables(); track table.name) {
                        <hlm-option [value]="table.name">{{
                          table.name
                        }}</hlm-option>
                        }
                      </hlm-select-content>
                    </brn-select>
                  </div>
                  <div class="grid gap-2">
                    <label class="text-sm font-medium" hlmLabel
                      >Reference Column</label
                    >
                    <brn-select
                      [(ngModel)]="column.foreign_key_column"
                      placeholder="Select column"
                      [disabled]="loadingTableSchema()"
                    >
                      <hlm-select-trigger class="w-full">
                        @if (loadingTableSchema()) {
                        <span class="text-muted-foreground"
                          >Loading columns...</span
                        >
                        } @else {
                        <hlm-select-value />
                        }
                      </hlm-select-trigger>
                      <hlm-select-content>
                        <hlm-select-label>Reference Column</hlm-select-label>
                        @if (selectedTableSchema()) { @for (col of
                        selectedTableSchema()!.info.columns; track col.name) {
                        <hlm-option [value]="col.name">
                          {{ col.name }}
                          @if (col.is_primary_key) {
                          <span class="ml-2 text-xs text-muted-foreground"
                            >(Primary Key)</span
                          >
                          }
                        </hlm-option>
                        } }
                      </hlm-select-content>
                    </brn-select>
                  </div>
                </div>
              </div>
              } @if (!column.is_primary_key) {
              <div class="flex justify-end">
                <button
                  hlmBtn
                  variant="destructive"
                  size="sm"
                  (click)="removeColumn(i)"
                  type="button"
                >
                  Remove Column
                </button>
              </div>
              }
            </div>
          </div>
          }
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 pb-8">
        <button hlmBtn variant="outline" (click)="onCancel()" type="button">
          Cancel
        </button>
        <button hlmBtn variant="default" (click)="onSave()" type="button">
          Save Changes
        </button>
      </div>
    </div>
  `,
})
export class TableSettingsComponent implements OnInit {
  private _schema!: TableSchema | null;

  @Input()
  set schema(value: TableSchema | null) {
    this._schema = value;
    if (value) {
      this._localSchema.set(JSON.parse(JSON.stringify(value)));
    }
  }
  get schema(): TableSchema | null {
    return this._schema;
  }

  @Output() close = new EventEmitter<TableSchema | null>();

  private _localSchema = signal<TableSchema>({
    name: '',
    info: {
      columns: [],
      foreignKeys: [],
    },
  });

  localSchema = computed(() => this._localSchema());

  private dbService = inject(DatabaseService);
  availableTables = signal<TableItem[]>([]);
  selectedTableSchema = signal<TableSchema | null>(null);
  loadingTableSchema = signal<boolean>(false);
  private tableSchemaCache = new Map<string, TableSchema>();

  ngOnInit() {
    if (this.schema) {
      console.log('Schema loaded:', this.schema);
      this._localSchema.set(JSON.parse(JSON.stringify(this.schema)));
    }
    // Load available tables for foreign key references
    this.loadAvailableTables();
  }

  private async loadAvailableTables() {
    try {
      const tables = await this.dbService
        .getTables()()
        .map((name: string) => {
          // Identify system tables (starting with underscore or pg_ prefix)
          const isSystem =
            name.startsWith('_') ||
            name.startsWith('pg_') ||
            [
              'fg_table_permissions',
              'internal_admin_audit_logs',
              'internal_admin_sessions',
              'internal_admins',
              'auth_config',
            ].includes(name);

          return {
            name,
            type: isSystem ? 'system' : 'user',
            icon: isSystem ? 'system' : 'table',
          } as TableItem;
        });
      this.availableTables.set(tables);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  }

  toggleForeignKey(column: any) {
    if (column.foreign_key_table === null) {
      column.foreign_key_table = '';
      column.foreign_key_column = '';
    } else {
      column.foreign_key_table = null;
      column.foreign_key_column = null;
      this.selectedTableSchema.set(null);
    }
  }

  async onTableSelect(tableName: string, column: any) {
    if (tableName) {
      // column.foreign_key_column = '';
      await this.loadTableSchema(tableName);
    }
  }

  async loadTableSchema(tableName: string) {
    if (this.tableSchemaCache.has(tableName)) {
      this.selectedTableSchema.set(this.tableSchemaCache.get(tableName)!);
      return;
    }

    this.loadingTableSchema.set(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/db/schema/tables/${tableName}`,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to load table schema');
      }

      const schema = await res.json();
      this.tableSchemaCache.set(tableName, schema);
      this.selectedTableSchema.set(schema);
      console.log('Table schema loaded:', schema);
    } catch (error) {
      console.error('Failed to load table schema:', error);
    } finally {
      this.loadingTableSchema.set(false);
    }
  }

  addNewColumn() {
    this._localSchema.update((schema) => ({
      ...schema,
      info: {
        ...schema.info,
        columns: [
          ...schema.info.columns,
          {
            name: '',
            table: schema.name,
            data_type: 'string', // Changed from varchar to match ColumnType
            default_value: null,
            max_length: null,
            numeric_precision: null,
            numeric_scale: null,
            is_generated: false,
            generation_expression: null,
            is_nullable: true,
            is_unique: false,
            is_primary_key: false,
            has_auto_increment: false,
            foreign_key_column: null,
            foreign_key_table: null,
          },
        ],
      },
    }));
  }

  removeColumn(index: number) {
    this._localSchema.update((schema) => ({
      ...schema,
      info: {
        ...schema.info,
        columns: schema.info.columns.filter((_: any, i: any) => i !== index),
      },
    }));
  }

  onPrimaryKeyChange(column: any) {
    if (column.is_primary_key) {
      // When setting a new primary key, unset any existing ones
      this._localSchema.update((schema) => ({
        ...schema,
        info: {
          ...schema.info,
          columns: schema.info.columns.map((col) =>
            col.name !== column.name ? { ...col, is_primary_key: false } : col
          ),
        },
      }));
    }
  }

  onCancel() {
    this.close.emit(null);
  }

  onSave() {
    // Validate schema before saving
    if (this.validateSchema()) {
      this.close.emit(this.localSchema());
    }
  }

  private validateSchema(): boolean {
    const schema = this.localSchema();

    // Check if table name exists
    if (!schema.name) {
      console.error('Table name is required');
      return false;
    }

    // Check if there's at least one column
    if (!schema.info.columns.length) {
      console.error('Table must have at least one column');
      return false;
    }

    // Check if all columns have names and types
    for (const column of schema.info.columns) {
      if (!column.name) {
        console.error('All columns must have names');
        return false;
      }
      if (!column.data_type) {
        console.error('All columns must have data types');
        return false;
      }
    }

    // Check if there's exactly one primary key
    const primaryKeys = schema.info.columns.filter(
      (col: any) => col.is_primary_key
    );
    if (primaryKeys.length !== 1) {
      console.error('Table must have exactly one primary key');
      return false;
    }

    return true;
  }

  columnTypes = signal<ColumnType[]>([
    'increments',
    'string',
    'text',
    'integer',
    'bigInteger',
    'boolean',
    'decimal',
    'float',
    'datetime',
    'date',
    'time',
    'timestamp',
    'binary',
    'json',
    'jsonb',
    'enum',
    'uuid',
    'varchar',
    'char',
  ]);
}
