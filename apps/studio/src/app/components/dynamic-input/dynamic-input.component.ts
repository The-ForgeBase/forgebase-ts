import {
  Component,
  Input,
  OnInit,
  forwardRef,
  signal,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { EnumSelectComponent } from '../enum-select/enum-select.component';
import { ColumnType } from '../../shared/types/database';
import { HlmSwitchComponent } from '@spartan-ng/ui-switch-helm';

/**
 * SQL type to TypeScript type mapping
 * Used for type conversion and validation
 */
const SQL_TO_TS_TYPE = new Map<string, string>([
  ['varchar', 'string'],
  ['character varying', 'string'],
  ['text', 'string'],
  ['integer', 'number'],
  ['float', 'number'],
  ['datetime', 'Date'],
  ['timestamp with time zone', 'Date'],
  ['timestamp without time zone', 'Date'],
  ['date', 'Date'],
  ['timestamp', 'Date'],
  ['boolean', 'boolean'],
  ['json', 'Record<string, any>'],
  ['jsonb', 'Record<string, any>'],
  ['uuid', 'string'],
  ['char', 'string'],
  ['bigint', 'number'],
  ['bigInteger', 'number'],
  ['decimal', 'number'],
  ['numeric', 'number'],
  ['real', 'number'],
  ['binary', 'string'],
  ['time', 'string'],
  ['enum', 'string'],
]);

/**
 * SQL type to ColumnType mapping
 * Maps SQL data types to our supported column types
 */
const SQL_TO_COLUMN_TYPE = new Map<string, ColumnType>([
  ['varchar', 'string'],
  ['text', 'text'],
  ['integer', 'integer'],
  ['float', 'float'],
  ['datetime', 'datetime'],
  ['timestamp with time zone', 'timestamp'],
  ['timestamp without time zone', 'timestamp'],
  ['date', 'date'],
  ['timestamp', 'timestamp'],
  ['boolean', 'boolean'],
  ['json', 'json'],
  ['jsonb', 'jsonb'],
  ['uuid', 'uuid'],
  ['character varying', 'string'],
  ['bigint', 'bigInteger'],
  ['numeric', 'decimal'],
  ['decimal', 'decimal'],
  ['real', 'float'],
  ['char', 'string'],
  ['time', 'time'],
  ['bytea', 'binary'],
  ['serial', 'increments'],
  ['bigserial', 'increments'],
  ['enum', 'enum'],
]);

/**
 * A dynamic form input component that renders the appropriate input type
 * based on the SQL data type.
 *
 * @example
 * <app-dynamic-input
 *   [dataType]="'varchar'"
 *   [columnName]="'name'"
 *   [required]="true"
 *   [(ngModel)]="user.name"
 * ></app-dynamic-input>
 */
@Component({
  selector: 'app-dynamic-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    InputSwitchModule,
    InputNumberModule,
    InputTextModule,
    CalendarModule,
    DropdownModule,
    HlmInputDirective,
    HlmSwitchComponent,
    EnumSelectComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DynamicInputComponent),
      multi: true,
    },
  ],
  template: `
    <ng-container [ngSwitch]="columnType()">
      <!-- String Input -->
      <ng-container *ngSwitchCase="'string'">
        <input
          hlmInput
          type="text"
          class="w-full"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onInputChange($event)"
          (blur)="onTouched()"
        />
      </ng-container>

      <!-- Text Area Input -->
      <ng-container *ngSwitchCase="'text'">
        <textarea
          hlmInput
          class="w-full min-h-[80px]"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onInputChange($event)"
          (blur)="onTouched()"
        ></textarea>
      </ng-container>

      <!-- Boolean Input -->
      <ng-container *ngSwitchCase="'boolean'">
        <div class="flex items-center space-x-2 w-full">
          <hlm-switch
            [id]="columnName"
            [disabled]="disabled()"
            [checked]="!!value()"
            (changed)="onBooleanChange($event)"
          />
          <span class="text-sm text-muted-foreground">{{
            value() ? 'Yes' : 'No'
          }}</span>
        </div>
      </ng-container>

      <!-- Number Input -->
      <ng-container *ngSwitchCase="'integer'">
        <input
          hlmInput
          type="number"
          class="w-full"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onIntegerChange($event)"
          (blur)="onTouched()"
          step="1"
        />
      </ng-container>

      <!-- Big Integer Input -->
      <ng-container *ngSwitchCase="'bigInteger'">
        <input
          hlmInput
          type="number"
          class="w-full"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onIntegerChange($event)"
          (blur)="onTouched()"
          step="1"
        />
      </ng-container>

      <!-- Decimal Input -->
      <ng-container *ngSwitchCase="'decimal'">
        <input
          hlmInput
          type="number"
          class="w-full"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onDecimalChange($event)"
          (blur)="onTouched()"
          step="0.01"
        />
      </ng-container>

      <!-- Float Input -->
      <ng-container *ngSwitchCase="'float'">
        <input
          hlmInput
          type="number"
          class="w-full"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onDecimalChange($event)"
          (blur)="onTouched()"
          step="any"
        />
      </ng-container>

      <!-- Date Input -->
      <ng-container *ngSwitchCase="'date'">
        <div class="relative">
          <p-calendar
            [id]="columnName"
            [name]="columnName"
            [placeholder]="placeholder"
            [disabled]="disabled()"
            [required]="required"
            [showIcon]="true"
            dateFormat="yy-mm-dd"
            styleClass="w-full"
            [inputStyle]="{ width: '100%' }"
            [(ngModel)]="dateValue"
            (onSelect)="onDateChange()"
            (onBlur)="onTouched()"
          ></p-calendar>
        </div>
      </ng-container>

      <!-- Datetime/Timestamp Input -->
      <ng-container *ngSwitchCase="'datetime'">
        <div class="relative">
          <p-calendar
            [id]="columnName"
            [name]="columnName"
            [placeholder]="placeholder"
            [disabled]="disabled()"
            [required]="required"
            [showIcon]="true"
            [showTime]="true"
            dateFormat="yy-mm-dd"
            styleClass="w-full"
            [inputStyle]="{ width: '100%' }"
            [(ngModel)]="dateValue"
            (onSelect)="onDateChange()"
            (onBlur)="onTouched()"
          ></p-calendar>
        </div>
      </ng-container>

      <!-- Timestamp Input -->
      <ng-container *ngSwitchCase="'timestamp'">
        <div class="relative">
          <p-calendar
            [id]="columnName"
            [name]="columnName"
            [placeholder]="placeholder"
            [disabled]="disabled()"
            [required]="required"
            [showIcon]="true"
            [showTime]="true"
            dateFormat="yy-mm-dd"
            styleClass="w-full"
            [inputStyle]="{ width: '100%' }"
            [(ngModel)]="dateValue"
            (onSelect)="onDateChange()"
            (onBlur)="onTouched()"
          ></p-calendar>
        </div>
      </ng-container>

      <!-- Time Input -->
      <ng-container *ngSwitchCase="'time'">
        <div class="relative">
          <p-calendar
            [id]="columnName"
            [name]="columnName"
            [placeholder]="placeholder"
            [disabled]="disabled()"
            [required]="required"
            [showIcon]="true"
            [timeOnly]="true"
            styleClass="w-full"
            [inputStyle]="{ width: '100%' }"
            [(ngModel)]="dateValue"
            (onSelect)="onDateChange()"
            (onBlur)="onTouched()"
          ></p-calendar>
        </div>
      </ng-container>

      <!-- JSON Input -->
      <ng-container *ngSwitchCase="'json'">
        <textarea
          hlmInput
          class="w-full min-h-[120px] font-mono text-sm"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder || '{}'"
          [disabled]="disabled()"
          [required]="required"
          [value]="formatJson(value())"
          (input)="onJsonChange($event)"
          (blur)="validateAndFormatJson()"
        ></textarea>
        <p *ngIf="jsonError()" class="text-xs text-red-500 mt-1">
          {{ jsonError() }}
        </p>
      </ng-container>

      <!-- JSONB Input -->
      <ng-container *ngSwitchCase="'jsonb'">
        <textarea
          hlm
          class="w-full min-h-[120px] font-mono text-sm"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder || '{ }'"
          [disabled]="disabled()"
          [required]="required"
          [value]="formatJson(value())"
          (input)="onJsonChange($event)"
          (blur)="validateAndFormatJson()"
        ></textarea>
        <p *ngIf="jsonError()" class="text-xs text-red-500 mt-1">
          {{ jsonError() }}
        </p>
      </ng-container>

      <!-- UUID Input -->
      <ng-container *ngSwitchCase="'uuid'">
        <input
          hlmInput
          type="text"
          class="w-full font-mono"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onInputChange($event)"
          (blur)="onUuidBlur($event)"
          pattern="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
        />
      </ng-container>

      <!-- Binary Input - Using file input for binary data -->
      <ng-container *ngSwitchCase="'binary'">
        <div class="flex items-center justify-center w-full">
          <label
            [for]="columnName"
            class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/30 border-muted-foreground/20"
          >
            <div class="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-8 h-8 mb-3 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p class="mb-2 text-sm text-muted-foreground">
                <span class="font-semibold">Click to upload</span> or drag and
                drop
              </p>
              <p class="text-xs text-muted-foreground/70">
                Binary data (MAX 10MB)
              </p>
            </div>
            <input
              [id]="columnName"
              type="file"
              class="hidden"
              [disabled]="disabled()"
              (change)="onBinaryChange($event)"
            />
          </label>
        </div>
        <p *ngIf="binaryFileName()" class="mt-2 text-xs text-muted-foreground">
          Selected: {{ binaryFileName() }}
        </p>
      </ng-container>

      <!-- Enum Input using EnumSelectComponent -->
      <ng-container *ngSwitchCase="'enum'">
        <app-enum-select
          [options]="enumOptions"
          [placeholder]="placeholder || 'Select an option'"
          [disabled]="disabled()"
          [required]="required"
          [(ngModel)]="enumValue"
          (ngModelChange)="onEnumChange($event)"
          [sorted]="true"
          [allowEmpty]="!required"
          [emptyOptionLabel]="'Select...'"
        ></app-enum-select>
      </ng-container>

      <!-- Default/Fallback Input -->
      <ng-container *ngSwitchDefault>
        <input
          hlmInput
          type="text"
          class="w-full"
          [id]="columnName"
          [name]="columnName"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          [required]="required"
          [value]="value()"
          (input)="onInputChange($event)"
          (blur)="onTouched()"
        />
        <p class="text-xs text-amber-500 mt-1">
          Unknown data type: {{ dataType }}
        </p>
      </ng-container>
    </ng-container>
  `,
})
export class DynamicInputComponent implements ControlValueAccessor, OnInit {
  private platformId = inject(PLATFORM_ID);

  /** The SQL data type of the column */
  @Input() dataType = '';

  /** Name of the column */
  @Input() columnName = '';

  /** Whether the field is required */
  @Input() required = false;

  /** Placeholder text for the input */
  @Input() placeholder = '';

  /** Available options for enum type */
  @Input() enumOptions: string[] = [];

  /** Current value of the input */
  private _value = signal<any>(null);

  /** Whether the input is disabled */
  disabled = signal<boolean>(false);

  /** Column type (mapped from SQL data type) */
  columnType = signal<ColumnType>('string');

  /** Error message for JSON validation */
  jsonError = signal<string>('');

  /** Selected file name for binary input */
  binaryFileName = signal<string>('');

  /** Date value for calendar components */
  dateValue: Date | null = null;

  /** Enum value for enum select component */
  enumValue: string | null = null;

  /**
   * Internal value accessor
   */
  value = this._value;

  /** Change callback for ControlValueAccessor */
  private onChange: (value: any) => void = () => {};

  /** Touch callback for ControlValueAccessor */
  onTouched: () => void = () => {};

  constructor() {
    // Handle date type initialization
    effect(() => {
      if (
        ['date', 'datetime', 'timestamp', 'time'].includes(this.columnType())
      ) {
        const val = this._value();
        if (val && typeof val === 'string') {
          this.dateValue = new Date(val);
        } else if (val instanceof Date) {
          this.dateValue = val;
        }
      }
    });

    // Handle enum type initialization
    effect(() => {
      if (this.columnType() === 'enum') {
        this.enumValue = this._value();
      }
    });
  }

  ngOnInit() {
    // Map SQL data type to column type
    this.mapDataType();
  }

  /**
   * Maps SQL data type to column type
   */
  private mapDataType() {
    if (!this.dataType) {
      this.columnType.set('string');
      return;
    }

    const type = SQL_TO_COLUMN_TYPE.get(this.dataType.toLowerCase());
    if (type) {
      this.columnType.set(type);
    } else {
      console.warn(
        `Unknown data type: ${this.dataType}. Falling back to string.`
      );
      this.columnType.set('string');
    }
  }

  /**
   * Standard input change handler
   */
  onInputChange(event: Event) {
    const target = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    this.updateValue(target.value);
  }

  /**
   * Integer input change handler
   */
  onIntegerChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value ? parseInt(target.value, 10) : null;
    this.updateValue(value);
  }

  /**
   * Decimal/float input change handler
   */
  onDecimalChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value ? parseFloat(target.value) : null;
    this.updateValue(value);
  }

  /**
   * Boolean input change handler
   */
  onBooleanChange(checked: boolean) {
    this.updateValue(checked);
  }

  /**
   * Date input change handler
   */
  onDateChange() {
    if (this.dateValue) {
      let value: string | Date = this.dateValue;

      // Format based on type
      if (this.columnType() === 'date') {
        value = this.formatDate(this.dateValue);
      } else if (this.columnType() === 'time') {
        value = this.formatTime(this.dateValue);
      }

      this.updateValue(value);
    } else {
      this.updateValue(null);
    }
  }

  /**
   * JSON input change handler
   */
  onJsonChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    try {
      // Only update if valid JSON or empty
      if (!target.value.trim()) {
        this.updateValue(null);
        this.jsonError.set('');
      } else {
        // Just capture the string value, don't parse yet
        this._value.set(target.value);
      }
    } catch (e) {
      // Don't update value on syntax errors
    }
  }

  /**
   * Enum select change handler
   */
  onEnumChange(value: string | null) {
    this.updateValue(value);
  }

  /**
   * UUID input blur handler - validates format
   */
  onUuidBlur(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (!value || this.isValidUUID(value)) {
      return;
    }

    // Invalid UUID format
    target.classList.add('border-red-500');
    setTimeout(() => {
      target.classList.remove('border-red-500');
    }, 2000);
  }

  /**
   * Binary input change handler
   */
  onBinaryChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.binaryFileName.set(file.name);

      // Update with file info (this would be replaced by actual binary handling in production)
      this.updateValue({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        // In a real implementation, you might use FileReader to read the file as binary
      });
    } else {
      this.binaryFileName.set('');
      this.updateValue(null);
    }
  }

  /**
   * Helper to validate and format JSON
   */
  validateAndFormatJson() {
    const currentValue = this._value();
    if (!currentValue) {
      this.jsonError.set('');
      return;
    }

    try {
      // Try to parse the JSON to validate it
      const parsedJson =
        typeof currentValue === 'string'
          ? JSON.parse(currentValue)
          : currentValue;

      // Update with formatted JSON
      this.jsonError.set('');
      this.updateValue(parsedJson);
    } catch (e) {
      this.jsonError.set('Invalid JSON format');
    }
  }

  /**
   * Formats JSON for display
   */
  formatJson(value: any): string {
    if (!value) return '';

    try {
      if (typeof value === 'string') {
        // If it's already a string, validate it first
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } else {
        // Object value
        return JSON.stringify(value, null, 2);
      }
    } catch {
      // If not valid JSON, return as is
      return typeof value === 'string' ? value : String(value);
    }
  }

  /**
   * Format date as ISO string without time
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time only
   */
  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }

  /**
   * Check if string is valid UUID
   */
  private isValidUUID(uuid: string): boolean {
    const regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  }

  /**
   * Update value and trigger change
   */
  private updateValue(value: any) {
    this._value.set(value);
    this.onChange(value);
  }

  // ControlValueAccessor Implementation
  writeValue(value: any): void {
    this._value.set(value);

    // Special handling for date types
    if (['date', 'datetime', 'timestamp', 'time'].includes(this.columnType())) {
      if (value) {
        this.dateValue = value instanceof Date ? value : new Date(value);
      } else {
        this.dateValue = null;
      }
    }

    // Special handling for enum type
    if (this.columnType() === 'enum') {
      this.enumValue = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
