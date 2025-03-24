import { Component, forwardRef, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChipModule } from 'primeng/chip';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import {
  ControlValueAccessor,
  FormControl,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-chip-input',
  standalone: true,
  imports: [
    CommonModule,
    ChipModule,
    HlmInputDirective,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChipInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="space-y-2">
      <div
        class="flex items-center gap-2 flex-wrap min-h-[32px] p-2 border rounded-md"
      >
        @for (chip of chips(); track chip) {
        <p-chip
          [label]="chip"
          [removable]="true"
          (onRemove)="removeChip(chip)"
          styleClass="bg-primary/10 text-primary border-none shadow-none"
        />
        }
        <input
          hlmInput
          type="text"
          [placeholder]="placeholder()"
          [attr.disabled]="isDisabled"
          [formControl]="inputControl"
          class="flex-1 !border-none !ring-0 !shadow-none !min-w-[120px]"
          (keydown)="onKeyDown($event)"
          (blur)="onBlur()"
        />
      </div>
      @if (hint()) {
      <p class="text-xs text-muted-foreground">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-chip {
          @apply text-xs font-medium py-0.5;
        }
        .p-chip .p-chip-remove-icon {
          @apply opacity-50 hover:opacity-100 transition-opacity;
        }
      }
    `,
  ],
})
export class ChipInputComponent implements ControlValueAccessor {
  placeholder = input('Type and press enter');
  hint = input('');
  chips = signal<string[]>([]);
  inputControl = new FormControl('');
  isDisabled = false;

  // ControlValueAccessor methods
  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[]): void {
    if (Array.isArray(value)) {
      this.chips.set(value);
    } else {
      this.chips.set([]);
    }
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (isDisabled) {
      this.inputControl.disable();
    } else {
      this.inputControl.enable();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled) return;

    const value = this.inputControl.value?.trim() ?? '';

    // Handle comma or enter key
    if ((event.key === ',' || event.key === 'Enter') && value) {
      event.preventDefault();
      this.addChip(value);
      this.inputControl.setValue('');
    }
    // Handle backspace on empty input to remove last chip
    else if (event.key === 'Backspace' && !value && this.chips().length > 0) {
      this.removeChip(this.chips()[this.chips().length - 1]);
    }
  }

  addChip(value: string): void {
    if (!value || this.chips().includes(value)) return;

    this.chips.update((chips) => [...chips, value]);
    this.onChange(this.chips());
  }

  removeChip(chip: string): void {
    this.chips.update((chips) => chips.filter((c) => c !== chip));
    this.onChange(this.chips());
  }

  onBlur(): void {
    // Add chip on blur if there's a value
    const value = this.inputControl.value?.trim();
    if (value) {
      this.addChip(value);
      this.inputControl.setValue('');
    }
    this.onTouched();
  }
}
