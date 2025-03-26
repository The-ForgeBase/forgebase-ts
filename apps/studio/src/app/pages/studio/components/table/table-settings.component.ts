import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnType, TableSchema } from '../../../../shared/types/database';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { SelectModule } from 'primeng/select';
import { HlmCheckboxComponent } from '@spartan-ng/ui-checkbox-helm';

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
                  <p-select
                    [id]="'colType' + i"
                    [(ngModel)]="column.data_type"
                    [options]="dataTypes"
                    [placeholder]="'Select data type'"
                    appendTo="body"
                    styleClass="w-full"
                  ></p-select>
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
                    [checked]="column.is_primary_key"
                    (checkedChange)="onPrimaryKeyChange(column)"
                  />
                  <span class="text-sm">Primary Key</span>
                </label>
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox [(ngModel)]="column.is_unique" />
                  <span class="text-sm">Unique</span>
                </label>
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox [(ngModel)]="column.is_nullable" />
                  <span class="text-sm">Nullable</span>
                </label>
                <label class="flex items-center gap-2" hlmLabel>
                  <hlm-checkbox [(ngModel)]="column.has_auto_increment" />
                  <span class="text-sm">Auto Increment</span>
                </label>
              </div>

              @if (!column.is_primary_key) {
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

  ngOnInit() {
    if (this.schema) {
      this._localSchema.set(JSON.parse(JSON.stringify(this.schema)));
    }
  }

  // Map ColumnType to readable labels
  dataTypes = [
    { label: 'Auto Increment', value: 'increments' },
    { label: 'String', value: 'string' },
    { label: 'Text', value: 'text' },
    { label: 'Integer', value: 'integer' },
    { label: 'Big Integer', value: 'bigInteger' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'Decimal', value: 'decimal' },
    { label: 'Float', value: 'float' },
    { label: 'DateTime', value: 'datetime' },
    { label: 'Date', value: 'date' },
    { label: 'Time', value: 'time' },
    { label: 'Timestamp', value: 'timestamp' },
    { label: 'Binary', value: 'binary' },
    { label: 'JSON', value: 'json' },
    { label: 'JSONB', value: 'jsonb' },
    { label: 'Enum', value: 'enum' },
    { label: 'UUID', value: 'uuid' },
  ];

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
}
