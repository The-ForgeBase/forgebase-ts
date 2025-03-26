import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ColumnDefinition,
  ColumnType,
  TableItem,
  TableSchema,
} from '../../../../../shared/types/database';
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
import { DatabaseService } from '../../../../../services/database.service';
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
  templateUrl: './new-table.component.html',
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
  filteredSelectedTableSchema = computed(() => {
    const schema = this.selectedTableSchema();
    if (!schema) {
      return [];
    }

    // Find the column from the form that has this table selected as foreign key
    const parentColumn = this.columnControls.find(
      (control) =>
        control.get('foreignKeyEnabled')?.value &&
        control.get('foreignKeyTable')?.value === schema.name
    );

    if (!parentColumn) {
      return schema.info.columns;
    }

    const parentColumnType = parentColumn.get('type')?.value;

    // If parent column is text type, all columns are compatible
    if (parentColumnType === 'text') {
      return schema.info.columns;
    }

    // Define type compatibility map
    const compatibleTypes: Record<string, string[]> = {
      uuid: ['uuid'],
      string: ['string', 'text', 'uuid'],
      text: ['string', 'text'],
      integer: ['integer', 'bigInteger', 'increments'],
      bigInteger: ['integer', 'bigInteger', 'increments'],
      increments: ['integer', 'bigInteger', 'increments'],
      boolean: ['boolean'],
      decimal: ['decimal', 'float'],
      float: ['decimal', 'float'],
      datetime: ['datetime', 'timestamp'],
      date: ['date', 'datetime', 'timestamp'],
      time: ['time'],
      timestamp: ['datetime', 'timestamp'],
      binary: ['binary'],
      json: ['json', 'jsonb'],
      jsonb: ['json', 'jsonb'],
      enum: ['enum', 'string'],
      object: ['json', 'jsonb'],
      array: ['array', 'json', 'jsonb'],
      varchar: ['string', 'text', 'uuid', 'varchar'],
      char: ['string', 'text', 'uuid', 'char'],
    };

    // Filter columns based on type compatibility and primary key status
    return schema.info.columns.filter((column) => {
      // Always include primary key columns regardless of type
      if (column.is_primary_key) {
        return true;
      }

      // Check if the column type is compatible with the parent column type
      const compatibleColumnTypes = compatibleTypes[parentColumnType] || [];
      return compatibleColumnTypes.includes(column.data_type);
    });
  });

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
