import { Component, inject, input, output, signal } from '@angular/core';
import {
  ColumnDefinition,
  ColumnType,
  TableItem,
  TableSchema,
} from '../../../../shared/types/database';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { HlmFormFieldModule } from '@spartan-ng/ui-formfield-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import {
  HlmCardDirective,
  HlmCardContentDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
} from '@spartan-ng/ui-card-helm';
import { HlmAlertModule } from '@spartan-ng/ui-alert-helm';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideTrash2,
  lucidePlus,
  lucideDatabase,
  lucideColumns2,
} from '@ng-icons/lucide';
import { DatabaseService } from '../../../../services/database.service';
import { HlmCheckboxComponent } from '@spartan-ng/ui-checkbox-helm';

@Component({
  selector: 'studio-new-table',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    HlmFormFieldModule,
    HlmInputDirective,
    HlmSelectImports,
    BrnSelectImports,
    HlmLabelDirective,
    HlmButtonDirective,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardContentDirective,
    HlmAlertModule,
    NgIcon,
    HlmCheckboxComponent,
  ],
  providers: [
    provideIcons({
      lucideTrash2,
      lucidePlus,
      lucideDatabase,
      lucideColumns: lucideColumns2,
    }),
  ],
  template: `
    <form
      [formGroup]="tableForm"
      class="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6"
    >
      <div hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle class="flex items-center gap-2">
            <ng-icon name="lucideDatabase" size="24" />
            Create New Table
          </h2>
        </div>
        <div hlmCardContent>
          <hlm-form-field class="mb-6">
            <label hlmLabel for="tableName" class="mb-2">Table Name</label>
            <input
              name="tableName"
              id="tableName"
              formControlName="tableName"
              class="w-full"
              hlmInput
              type="text"
              placeholder="Enter table name"
              aria-describedby="tableNameHint tableNameError"
            />
            <hlm-hint id="tableNameHint"
              >Use lowercase letters, numbers, and underscores only</hlm-hint
            >
            @if (tableForm.get('tableName')?.invalid &&
            tableForm.get('tableName')?.touched) {
            <div id="tableNameError" class="text-red-500 text-sm mt-1">
              Please enter a valid table name (3-50 characters, letters,
              numbers, and underscores only)
            </div>
            }
          </hlm-form-field>

          <div class="space-y-6">
            <div class="flex items-center gap-2">
              <ng-icon name="lucideColumns" size="20" />
              <h3 class="text-lg font-semibold">Columns</h3>
            </div>

            <div formArrayName="columns" class="space-y-4">
              @for (col of columnControls; track $index) {
              <div [formGroupName]="$index" class="rounded-lg border bg-card">
                <div class="p-4" [class.border-t]="$index > 0">
                  <div class="grid gap-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div class="grid gap-2">
                        <label
                          class="text-sm font-medium"
                          [for]="'colName' + $index"
                          hlmLabel
                        >
                          Column Name
                        </label>
                        <input
                          [id]="'colName' + $index"
                          type="text"
                          hlmInput
                          formControlName="name"
                          placeholder="Enter column name"
                          class="w-full"
                        />
                      </div>
                      <div class="grid gap-2">
                        <label
                          class="text-sm font-medium"
                          [for]="'colType' + $index"
                          hlmLabel
                        >
                          Data Type
                        </label>
                        <brn-select
                          [id]="'colType' + $index"
                          formControlName="type"
                          placeholder="Select type"
                          class="!mt-2"
                        >
                          <hlm-select-trigger class="w-full">
                            <hlm-select-value />
                          </hlm-select-trigger>
                          <hlm-select-content>
                            <hlm-select-label>Column Type</hlm-select-label>
                            @for (type of columnTypes(); track type) {
                            <hlm-option [value]="type">
                              {{ type }}
                            </hlm-option>
                            }
                          </hlm-select-content>
                        </brn-select>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div class="flex items-center gap-4">
                        <label class="flex items-center gap-2" hlmLabel>
                          <hlm-checkbox
                            [attr.aria-checked]="col.get('nullable')?.value"
                            [attr.data-state]="
                              col.get('nullable')?.value
                                ? 'checked'
                                : 'unchecked'
                            "
                            (click)="
                              col
                                .get('nullable')
                                ?.setValue(!col.get('nullable')?.value)
                            "
                            [checked]="col.get('nullable')?.value"
                          />
                          <span class="text-sm">Nullable</span>
                        </label>
                        <label class="flex items-center gap-2" hlmLabel>
                          <hlm-checkbox
                            [attr.aria-checked]="col.get('isPrimary')?.value"
                            [attr.data-state]="
                              col.get('isPrimary')?.value
                                ? 'checked'
                                : 'unchecked'
                            "
                            (click)="onPrimaryKeyChange($index)"
                            [checked]="col.get('isPrimary')?.value"
                          />
                          <span class="text-sm">Primary Key</span>
                        </label>
                      </div>
                      <div class="flex items-center gap-4">
                        <label class="flex items-center gap-2" hlmLabel>
                          <hlm-checkbox
                            [attr.aria-checked]="col.get('isUnique')?.value"
                            [attr.data-state]="
                              col.get('isUnique')?.value
                                ? 'checked'
                                : 'unchecked'
                            "
                            (click)="
                              col
                                .get('isUnique')
                                ?.setValue(!col.get('isUnique')?.value)
                            "
                            [checked]="col.get('isUnique')?.value"
                          />
                          <span class="text-sm">Unique</span>
                        </label>
                        <label class="flex items-center gap-2" hlmLabel>
                          <hlm-checkbox
                            [attr.aria-checked]="
                              col.get('autoIncrement')?.value
                            "
                            [attr.data-state]="
                              col.get('autoIncrement')?.value
                                ? 'checked'
                                : 'unchecked'
                            "
                            (click)="onAutoIncrementChange($index)"
                            [checked]="col.get('autoIncrement')?.value"
                          />
                          <span class="text-sm">Auto Increment</span>
                        </label>
                      </div>
                    </div>

                    <div class="flex items-center gap-4">
                      <label class="flex items-center gap-2" hlmLabel>
                        <hlm-checkbox
                          [attr.aria-checked]="
                            col.get('foreignKeyEnabled')?.value
                          "
                          [attr.data-state]="
                            col.get('foreignKeyEnabled')?.value
                              ? 'checked'
                              : 'unchecked'
                          "
                          (click)="
                            onForeignKeyToggle(
                              $index,
                              !col.get('foreignKeyEnabled')?.value
                            )
                          "
                          [checked]="col.get('foreignKeyEnabled')?.value"
                        />
                        <span class="text-sm">Foreign Key</span>
                      </label>
                    </div>

                    @if (col.get('foreignKeyEnabled')?.value === true) {
                    <div class="grid gap-4 pt-2 border-t">
                      <div class="grid grid-cols-2 gap-4">
                        <div class="grid gap-2">
                          <label class="text-sm font-medium" hlmLabel
                            >Reference Table</label
                          >
                          <brn-select
                            formControlName="foreignKeyTable"
                            placeholder="Select table"
                            (valueChange)="onTableSelect($event, $index)"
                          >
                            <hlm-select-trigger class="w-full">
                              <hlm-select-value />
                            </hlm-select-trigger>
                            <hlm-select-content>
                              <hlm-select-label
                                >Reference Table</hlm-select-label
                              >
                              @for (table of tables(); track table) { @if
                              (table.name !== tableForm.get('tableName')?.value)
                              {
                              <hlm-option [value]="table.name">{{
                                table.name
                              }}</hlm-option>
                              } }
                            </hlm-select-content>
                          </brn-select>
                        </div>
                        <div class="grid gap-2">
                          <label class="text-sm font-medium" hlmLabel
                            >Reference Column</label
                          >
                          <brn-select
                            formControlName="foreignKeyColumn"
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
                              <hlm-select-label
                                >Reference Column</hlm-select-label
                              >
                              @if (selectedTableSchema()) { @for (column of
                              selectedTableSchema()!.info.columns; track
                              column.name) {
                              <hlm-option [value]="column.name">
                                {{ column.name }}
                                @if (column.is_primary_key) {
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
                    } @if ($index >= 3) {
                    <div class="flex justify-end">
                      <button
                        type="button"
                        hlmBtn
                        variant="destructive"
                        size="sm"
                        (click)="columnsFormArray.removeAt($index)"
                      >
                        Remove Column
                      </button>
                    </div>
                    }
                  </div>
                </div>
              </div>
              }
            </div>

            <button
              type="button"
              hlmBtn
              variant="outline"
              (click)="addColumn()"
              class="w-full flex items-center justify-center gap-2"
            >
              <ng-icon name="lucidePlus" size="16" />
              Add Column
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-4">
        <button type="button" hlmBtn variant="outline" (click)="onClose()">
          Cancel
        </button>
        <button
          type="submit"
          hlmBtn
          variant="default"
          (click)="createTable()"
          [disabled]="!tableForm.valid"
          class="min-w-[120px]"
        >
          Create Table
        </button>
      </div>
    </form>
  `,
})
export class NewTableComponent {
  private fb = inject(FormBuilder);
  private dbService = inject(DatabaseService);

  close = output();
  tables = input.required<TableItem[]>();
  showSystemTables = input<boolean>(false);

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
  ]);

  columns = signal<ColumnDefinition[]>([
    {
      name: 'id',
      type: 'uuid',
      nullable: false,
    },
    {
      name: 'created_at',
      type: 'timestamp',
      nullable: false,
    },
    {
      name: 'updated_at',
      type: 'timestamp',
      nullable: false,
    },
  ]);

  selectedTableSchema = signal<TableSchema | null>(null);
  loadingTableSchema = signal<boolean>(false);

  // Track table schemas that have been loaded
  private tableSchemaCache = new Map<string, TableSchema>();

  tableForm = this.fb.group({
    tableName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9_]+$/),
      ],
    ],
    columns: this.fb.array([]),
  });

  constructor() {
    // Initialize form with default columns
    this.columns().forEach((column) => {
      const foreignKeyColumn = new FormControl({ value: '', disabled: true });
      this.columnsFormArray.push(
        this.fb.group({
          name: [column.name],
          type: [column.type],
          nullable: [column.nullable],
          isPrimary: [false],
          isUnique: [false],
          autoIncrement: [false],
          foreignKeyEnabled: [false],
          foreignKeyTable: [''],
          foreignKeyColumn,
        })
      );
    });

    console.log('Tables:', this.dbService.getTables()());
  }

  get columnsFormArray() {
    return this.tableForm.get('columns') as FormArray;
  }

  get columnControls() {
    return this.columnsFormArray.controls;
  }

  onClose() {
    this.close.emit();
  }

  addColumn() {
    const foreignKeyColumn = new FormControl({ value: '', disabled: true });
    const newColumn = this.fb.group({
      name: [''],
      type: ['text'],
      nullable: [false],
      isPrimary: [false],
      isUnique: [false],
      autoIncrement: [false],
      foreignKeyEnabled: [false],
      foreignKeyTable: [''],
      foreignKeyColumn,
    });

    this.columnsFormArray.push(newColumn);
  }

  createTable() {
    if (this.tableForm.valid) {
      const tableName = this.tableForm.get('tableName')?.value;
      const columns = this.tableForm.get('columns')?.value.map((col: any) => {
        const column: ColumnDefinition = {
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          primary: col.isPrimary,
          unique: col.isUnique,
        };

        // Handle auto increment
        if (col.autoIncrement) {
          column.type = 'increments';
        }

        // Handle foreign key
        if (
          col.foreignKeyEnabled &&
          col.foreignKeyTable &&
          col.foreignKeyColumn
        ) {
          column.foreignKeys = {
            columnName: col.name,
            references: {
              tableName: col.foreignKeyTable,
              columnName: col.foreignKeyColumn,
            },
          };
        }

        return column;
      });

      console.log('Table Name:', tableName);
      console.log('Columns:', columns);

      if (!tableName || !columns) {
        console.error('Invalid table name or columns');
        alert('Invalid table name or columns. Please check your input.');
        return;
      }

      // Check if table name already exists
      const existingTable = this.tables().find(
        (table) => table.name === tableName
      );
      if (existingTable) {
        console.error('Table name already exists');
        alert('Table name already exists. Please choose a different name.');
        return;
      }

      const requestBody = {
        action: 'create',
        tableName,
        columns,
      };

      // console.log('Request Body:', requestBody);

      fetch('http://localhost:8000/api/db/schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })
        .then((response) => {
          const res = response.json();
          if (!response.ok) {
            console.error('Error creating table:', res);
            throw new Error('Network response was not ok');
          }
          return res;
        })
        .then((data) => {
          console.log('Table created successfully:', data);
          this.dbService.addTable(tableName);
          this.onClose();
        })
        .catch((error) => {
          console.error('Error creating table:', error);
          alert('Error creating table. Please try again.');
        });
    } else {
      console.error('Form is invalid');
      alert('Invalid table name or columns. Please check your input.');
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
    } catch (error) {
      console.error('Failed to load table schema:', error);
    } finally {
      this.loadingTableSchema.set(false);
    }
  }

  // Add this method to handle foreign key enabled/disabled state
  onForeignKeyToggle(columnIndex: number, enabled: boolean) {
    const column = this.columnControls[columnIndex];
    if (column) {
      const foreignKeyColumn = column.get('foreignKeyColumn');
      if (enabled) {
        foreignKeyColumn?.enable();
        column.get('foreignKeyEnabled')?.setValue(true);
      } else {
        foreignKeyColumn?.disable();
        column.get('foreignKeyEnabled')?.setValue(false);
        // Reset values when disabling
        column.patchValue({
          foreignKeyTable: '',
          foreignKeyColumn: '',
        });
        // Clear the selected table schema
        this.selectedTableSchema.set(null);
      }
    }
  }

  // Add this method to handle table selection and column enable/disable
  onTableSelect(tableName: string, columnIndex: number) {
    const column = this.columnControls[columnIndex];
    if (column && tableName) {
      // Temporarily disable the column select while loading
      column.get('foreignKeyColumn')?.disable();
      this.loadTableSchema(tableName).then(() => {
        // Re-enable the column select after schema is loaded
        if (column.get('foreignKeyEnabled')?.value) {
          column.get('foreignKeyColumn')?.enable();
        }
      });
    }
  }

  onPrimaryKeyChange(columnIndex: number) {
    const currentValue =
      this.columnControls[columnIndex].get('isPrimary')?.value;
    const newValue = !currentValue;

    if (newValue) {
      // If setting a column as primary, unset any other primary keys
      this.columnControls.forEach((control, index) => {
        if (index !== columnIndex) {
          control.get('isPrimary')?.setValue(false);
        }
      });
    }

    this.columnControls[columnIndex].get('isPrimary')?.setValue(newValue);
  }

  onAutoIncrementChange(columnIndex: number) {
    const column = this.columnControls[columnIndex];
    const currentValue = column.get('autoIncrement')?.value;
    const newValue = !currentValue;

    if (newValue) {
      // If enabling auto increment, set some sensible defaults
      const type = column.get('type')?.value;
      if (!['increments', 'integer', 'bigInteger'].includes(type)) {
        column.get('type')?.setValue('integer');
      }
    }

    column.get('autoIncrement')?.setValue(newValue);
  }
}
