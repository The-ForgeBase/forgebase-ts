import { Component, inject, input, output, signal } from '@angular/core';
import {
  ColumnDefinition,
  ColumnType,
  ForeignKey,
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
import { HlmSwitchComponent } from '@spartan-ng/ui-switch-helm';
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
    HlmSwitchComponent,
    HlmButtonDirective,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardContentDirective,
    HlmAlertModule,
    NgIcon,
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
              <div
                [formGroupName]="$index"
                hlmCard
                class="p-4 bg-card hover:bg-accent/5 transition-colors"
              >
                <div class="grid grid-cols-12 gap-4 items-center">
                  <!-- Column Name -->
                  <div class="col-span-3">
                    <hlm-form-field>
                      <label
                        [for]="'columnName-' + $index"
                        hlmLabel
                        class="mb-2"
                        >Name</label
                      >
                      <input
                        [name]="'columnName-' + $index"
                        [id]="'columnName-' + $index"
                        class="w-full"
                        hlmInput
                        type="text"
                        placeholder="Column name"
                        formControlName="name"
                        [attr.aria-label]="'Name for column ' + ($index + 1)"
                      />
                    </hlm-form-field>
                  </div>

                  <!-- Column Type -->
                  <div class="col-span-3">
                    <hlm-form-field>
                      <label
                        [for]="'columnType-' + $index"
                        hlmLabel
                        class="mb-2"
                        >Type</label
                      >
                      <brn-select
                        [id]="'columnType-' + $index"
                        formControlName="type"
                        placeholder="Select type"
                        class="!mt-2"
                      >
                        <hlm-select-trigger class="w-full">
                          <hlm-select-value />
                        </hlm-select-trigger>
                        <hlm-select-content>
                          <hlm-select-label>Column Type</hlm-select-label>
                          @for (option of columnTypes(); track option) {
                          <hlm-option class="uppercase" [value]="option">
                            {{ option }}
                          </hlm-option>
                          }
                        </hlm-select-content>
                      </brn-select>
                    </hlm-form-field>
                  </div>

                  <!-- Nullable Switch -->
                  <div class="col-span-2">
                    <label class="flex flex-col gap-2" hlmLabel>
                      <span
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >Nullable</span
                      >
                      <hlm-switch formControlName="nullable" class="mt-1.5" />
                    </label>
                  </div>

                  <!-- Foreign Key Section -->
                  <div class="col-span-3">
                    <label class="flex flex-col gap-2" hlmLabel>
                      <span class="text-sm font-medium leading-none"
                        >Foreign Key</span
                      >
                      <div class="flex items-center gap-4">
                        <hlm-switch
                          formControlName="foreignKeyEnabled"
                          (ngModelChange)="onForeignKeyToggle($index, $event)"
                        />
                        @if (col.get('foreignKeyEnabled')?.value) {
                        <div class="flex-1 space-y-2 flex flex-col gap-3">
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
                              @for (table of tables(); track table) {
                              <hlm-option [value]="table.name">{{
                                table.name
                              }}</hlm-option>
                              }
                            </hlm-select-content>
                          </brn-select>

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
                        }
                      </div>
                    </label>
                  </div>

                  <!-- Delete Column Button -->
                  <div class="col-span-1 flex justify-end">
                    <button
                      type="button"
                      hlmBtn
                      variant="ghost"
                      size="icon"
                      class="text-destructive hover:text-destructive/90"
                      (click)="columnsFormArray.removeAt($index)"
                      [attr.aria-label]="'Remove column ' + ($index + 1)"
                    >
                      <ng-icon name="lucideTrash2" size="16" />
                    </button>
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
          foreignKeyEnabled: [false],
          foreignKeyTable: [''],
          foreignKeyColumn,
        })
      );
    });

    console.log('Tables:', this.dbService.getTables());
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
        };

        if (col.foreignKeyEnabled) {
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
      } else {
        foreignKeyColumn?.disable();
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
}
