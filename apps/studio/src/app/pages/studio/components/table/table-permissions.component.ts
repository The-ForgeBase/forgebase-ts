import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { HlmSelectModule } from '@spartan-ng/ui-select-helm';
import {
  PermissionRule,
  TablePermissions,
} from '../../../../shared/types/database';
import { HlmCheckboxModule } from '@spartan-ng/ui-checkbox-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';
import { ChipInputComponent } from '../../../../components/chip-input/chip-input.component';

@Component({
  selector: 'studio-table-permissions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmButtonModule,
    HlmLabelDirective,
    HlmInputDirective,
    HlmSelectModule,
    HlmCheckboxModule,
    BrnSelectImports,
    HlmSelectImports,
    ChipInputComponent,
  ],
  template: `
    <form [formGroup]="form" class="space-y-6">
      <div formArrayName="operations" class="space-y-8">
        <!-- Operations -->
        @for (operation of operations; track operation) {
        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold">{{ operation }} Permissions</h3>
            <p class="text-sm text-muted-foreground">
              Configure who can {{ operation.toLowerCase() }} records in this
              table
            </p>
          </div>

          <div [formArrayName]="operation" class="space-y-4">
            @for (rule of getOperationRules(operation); track $index) {
            <div
              [formGroupName]="$index"
              class="space-y-4 p-4 border rounded-lg"
            >
              <!-- Rule Type -->
              <div class="space-y-2 w-full flex flex-col gap-3 items-start">
                <label hlmLabel>Permission Type</label>
                <brn-select
                  formControlName="allow"
                  class="w-full"
                  placeholder="Select an option"
                >
                  <hlm-select-trigger class="w-full">
                    <hlm-select-value />
                  </hlm-select-trigger>
                  <hlm-select-content>
                    <hlm-option value="public">Public Access</hlm-option>
                    <hlm-option value="private">Private Only</hlm-option>
                    <hlm-option value="role">Role Based</hlm-option>
                    <hlm-option value="auth">Authenticated Users</hlm-option>
                    <hlm-option value="guest">Guest Users</hlm-option>
                    <hlm-option value="labels">Label Based</hlm-option>
                    <hlm-option value="teams">Team Based</hlm-option>
                    <hlm-option value="static">Static Value</hlm-option>
                    <hlm-option value="fieldCheck">Field Check</hlm-option>
                    <hlm-option value="customSql">Custom SQL</hlm-option>
                  </hlm-select-content>
                </brn-select>
              </div>

              <!-- Conditional Fields -->
              @if (rule.get('allow')?.value === 'labels') {
              <div class="space-y-2">
                <label hlmLabel>Required Labels</label>
                <app-chip-input
                  formControlName="labels"
                  placeholder="Add labels"
                  hint="Press enter or comma to add labels"
                />
              </div>
              } @if (rule.get('allow')?.value === 'teams') {
              <div class="space-y-2">
                <label hlmLabel>Required Teams</label>
                <app-chip-input
                  formControlName="teams"
                  placeholder="Add teams"
                  hint="Press enter or comma to add teams"
                />
              </div>
              } @if (rule.get('allow')?.value === 'role') {
              <div class="space-y-2">
                <label hlmLabel>Required Roles</label>
                <app-chip-input
                  formControlName="roles"
                  placeholder="Add roles"
                  hint="Press enter or comma to add roles"
                />
              </div>
              } @if (rule.get('allow')?.value === 'static') {
              <div class="space-y-2">
                <label hlmLabel>Static Value</label>
                <div class="flex items-center space-x-2">
                  <input type="checkbox" formControlName="static" hlmCheckbox />
                  <span class="text-sm">Allow access</span>
                </div>
              </div>
              } @if (rule.get('allow')?.value === 'customSql') {
              <div class="space-y-2">
                <label hlmLabel>Custom SQL</label>
                <textarea
                  hlmInput
                  formControlName="customSql"
                  placeholder="Enter custom SQL condition"
                  class="w-full min-h-[100px]"
                ></textarea>
              </div>
              } @if (rule.get('allow')?.value === 'fieldCheck') {
              <div class="space-y-4">
                <div class="space-y-2">
                  <label hlmLabel>Field Name</label>
                  <input
                    hlmInput
                    type="text"
                    formControlName="field"
                    placeholder="Enter field name"
                    class="w-full"
                  />
                </div>

                <div class="space-y-2 w-full flex flex-col gap-3 items-start">
                  <label hlmLabel>Operator</label>
                  <brn-select
                    formControlName="operator"
                    class="w-full"
                    placeholder="Select an operator"
                  >
                    <hlm-select-trigger class="w-full">
                      <hlm-select-value />
                    </hlm-select-trigger>
                    <hlm-select-content>
                      <hlm-option value="===">=== (Equals)</hlm-option>
                      <hlm-option value="!==">!== (Not Equals)</hlm-option>
                      <hlm-option value="in">in (Contains)</hlm-option>
                      <hlm-option value="notIn"
                        >notIn (Not Contains)</hlm-option
                      >
                    </hlm-select-content>
                  </brn-select>
                </div>

                <div class="space-y-2 w-full flex flex-col gap-3 items-start">
                  <label hlmLabel>Value Type</label>
                  <brn-select
                    formControlName="valueType"
                    class="w-full"
                    placeholder="Select a value type"
                  >
                    <hlm-select-trigger class="w-full">
                      <hlm-select-value />
                    </hlm-select-trigger>
                    <hlm-select-content>
                      <hlm-option value="userContext">User Context</hlm-option>
                      <hlm-option value="static">Static Value</hlm-option>
                    </hlm-select-content>
                  </brn-select>
                </div>

                <div class="space-y-2 w-full flex flex-col gap-3 items-start">
                  <label hlmLabel>Value</label>
                  @if (rule.get('valueType')?.value === 'userContext') {
                  <brn-select
                    formControlName="value"
                    class="w-full"
                    placeholder="Select a value"
                  >
                    <hlm-select-trigger class="w-full">
                      <hlm-select-value />
                    </hlm-select-trigger>
                    <hlm-select-content>
                      <hlm-option value="userId">User ID</hlm-option>
                      <hlm-option value="labels">Labels</hlm-option>
                      <hlm-option value="teams">Teams</hlm-option>
                      <hlm-option value="role">Role</hlm-option>
                    </hlm-select-content>
                  </brn-select>

                  } @else {
                  <input
                    hlmInput
                    type="text"
                    formControlName="value"
                    placeholder="Enter static value"
                    class="w-full"
                  />
                  }
                </div>
              </div>
              }

              <!-- Remove Rule Button -->
              <button
                hlmBtn
                variant="destructive"
                type="button"
                (click)="removeRule(operation, $index)"
                class="w-full"
              >
                Remove Rule
              </button>
            </div>
            }

            <!-- Add Rule Button -->
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="addRule(operation)"
              class="w-full"
            >
              Add {{ operation }} Rule
            </button>
          </div>
        </div>
        }
      </div>

      <!-- Save Button -->
      <div class="flex justify-end gap-3 pt-6 border-t">
        <button
          hlmBtn
          variant="outline"
          type="button"
          (click)="close.emit(null)"
        >
          Cancel
        </button>
        <button hlmBtn type="submit" (click)="savePermissions()">
          Save Permissions
        </button>
      </div>
    </form>
  `,
})
export class TablePermissionsComponent {
  close = output<TablePermissions | null>();
  permissions = input<TablePermissions>();

  private fb = inject(FormBuilder);
  operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  loading = signal(false);

  form = this.fb.group({
    operations: this.fb.group({
      SELECT: this.fb.array([]),
      INSERT: this.fb.array([]),
      UPDATE: this.fb.array([]),
      DELETE: this.fb.array([]),
    }),
  });

  constructor() {
    effect(() => {
      const perms = this.permissions();
      //console.log('Initializing permissions:', perms);
      if (perms && perms.operations) {
        //console.log('Initializing permissions:', perms);
        this.initializeForm(perms);
      }
    });
  }

  initializeForm(permissions: TablePermissions) {
    for (const operation of this.operations) {
      const rulesArray = this.form.get(['operations', operation]) as FormArray;
      const rules =
        permissions.operations[
          operation as keyof TablePermissions['operations']
        ];
      if (rules) {
        for (const rule of rules) {
          const ruleGroup = this.fb.group({
            allow: [rule.allow, Validators.required],
            labels: [rule.labels || []],
            teams: [rule.teams || []],
            roles: [rule.roles || []],
            static: [rule.static || false],
            customSql: [rule.customSql || ''],
            field: [rule.fieldCheck?.field || ''],
            operator: [rule.fieldCheck?.operator || '==='],
            valueType: [rule.fieldCheck?.valueType || 'userContext'],
            value: [
              rule.fieldCheck?.valueType === 'userContext'
                ? rule.fieldCheck?.value
                : Array.isArray(rule.fieldCheck?.value)
                ? rule.fieldCheck?.value.join(',')
                : '',
            ],
          });
          rulesArray.push(ruleGroup);
        }
      }
    }
  }

  getOperationRules(operation: string): FormGroup[] {
    return (this.form.get(['operations', operation]) as FormArray)
      .controls as FormGroup[];
  }

  addRule(operation: string) {
    const rulesArray = this.form.get(['operations', operation]) as FormArray;
    const newRule = this.fb.group({
      allow: ['public', Validators.required],
      labels: [[]],
      teams: [[]],
      roles: [[]],
      static: [false],
      customSql: [''],
      field: [''],
      operator: ['==='],
      valueType: ['userContext'],
      value: ['userId'],
    });

    rulesArray.push(newRule);
  }

  removeRule(operation: string, index: number) {
    const rulesArray = this.form.get(['operations', operation]) as FormArray;
    rulesArray.removeAt(index);
  }

  async savePermissions() {
    if (this.form.invalid) return;

    try {
      this.loading.set(true);
      const permissions: TablePermissions = {
        operations: {},
      };

      // Process each operation
      for (const operation of this.operations) {
        const rules = (this.form.get(['operations', operation]) as FormArray)
          .value;
        if (rules.length > 0) {
          permissions.operations[
            operation as keyof TablePermissions['operations']
          ] = rules.map((rule: any) => {
            // Clean up the rule by removing unused properties based on the allow type
            const cleanedRule: PermissionRule = { allow: rule.allow };

            switch (rule.allow) {
              case 'labels':
                cleanedRule.labels = rule.labels; // No need to split, already an array
                break;
              case 'teams':
                cleanedRule.teams = rule.teams; // No need to split, already an array
                break;
              case 'role':
                cleanedRule.roles = rule.roles; // No need to split, already an array
                break;
              case 'static':
                cleanedRule.static = rule.static;
                break;
              case 'customSql':
                cleanedRule.customSql = rule.customSql;
                break;
              case 'fieldCheck':
                cleanedRule.fieldCheck = {
                  field: rule.field,
                  operator: rule.operator,
                  valueType: rule.valueType,
                  value:
                    rule.valueType === 'userContext'
                      ? rule.value
                      : rule.value.split(',').map((v: string) => v.trim()),
                };
                break;
            }

            return cleanedRule;
          });
        }
      }

      // TODO: Save permissions to the backend
      console.log('Permissions to save:', permissions);

      this.close.emit(permissions);
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
