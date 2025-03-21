import { Component, Input, forwardRef, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
} from '@angular/forms';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';
import { HlmSeparatorDirective } from '@spartan-ng/ui-separator-helm';
import { BrnSeparatorComponent } from '@spartan-ng/brain/separator';

/**
 * A sophisticated enum select component that renders enum options with proper
 * styling and supports both single selection and multi-selection modes.
 *
 * @example
 * <app-enum-select
 *   [options]="['Active', 'Pending', 'Archived']"
 *   [placeholder]="'Select status'"
 *   [(ngModel)]="user.status"
 * ></app-enum-select>
 */
@Component({
  selector: 'app-enum-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BrnSelectImports,
    HlmSelectImports,
    HlmSeparatorDirective,
    BrnSeparatorComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EnumSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      <brn-select
        #select
        [disabled]="disabled()"
        (valueChange)="onValueChange($event)"
        [value]="_value()"
        [placeholder]="placeholder"
      >
        <hlm-select-trigger class="w-full">
          <hlm-select-value class="text-[13px]">
            {{ _value() || placeholder }}
          </hlm-select-value>
        </hlm-select-trigger>
        <hlm-select-content>
          <hlm-select-scroll-up />
          <hlm-select-group>
            @if (allowEmpty) {
            <hlm-option value="">{{ emptyOptionLabel }}</hlm-option>

            <brn-separator hlmSeparator />

            } @for (option of displayOptions(); track option) {
            <hlm-option [value]="option">{{ option }}</hlm-option>
            }
          </hlm-select-group>
        </hlm-select-content>
      </brn-select>
    </div>
  `,
})
export class EnumSelectComponent implements ControlValueAccessor, OnInit {
  /** Options available for selection */
  @Input() options: string[] = [];

  /** Placeholder text when no value is selected */
  @Input() placeholder = 'Select an option...';

  /** Whether to allow empty selection */
  @Input() allowEmpty = true;

  /** Label for empty option */
  @Input() emptyOptionLabel = 'None';

  /** Whether to sort options alphabetically */
  @Input() sorted = false;

  /** Current selected value */
  _value = signal<string | null>(null);

  /** Whether the select is disabled */
  disabled = signal<boolean>(false);

  /** Display options with sorting applied if needed */
  displayOptions = signal<string[]>([]);

  /** Change callback function */
  private onChange: (value: string | null) => void = () => {};

  /** Touch callback function */
  onTouched: () => void = () => {};

  /**
   * Initialize component and prepare options
   */
  ngOnInit(): void {
    this.prepareOptions();
  }

  /**
   * Prepare options array with sorting if needed
   */
  private prepareOptions(): void {
    if (this.sorted && this.options) {
      const sortedOptions = [...this.options].sort((a, b) =>
        a.localeCompare(b)
      );
      this.displayOptions.set(sortedOptions);
    } else {
      this.displayOptions.set(this.options || []);
    }
  }

  /**
   * Handle value change from select component
   */
  onValueChange(value: any): void {
    this._value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: string | null): void {
    this._value.set(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
