this is the schema response example `http://localhost:8000/api/db/schema/tables/${this.tableName}`,

{"name":"users","info":{"columns":[{"name":"id","table":"users","data_type":"char","default_value":"lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))","max_length":36,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":true,"is_primary_key":true,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"email","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"phone","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":true,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"name","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"picture","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"password_hash","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"email_verified","table":"users","data_type":"boolean","default_value":"0","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"phone_verified","table":"users","data_type":"boolean","default_value":"0","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"mfa_enabled","table":"users","data_type":"boolean","default_value":"0","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"mfa_secret","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"mfa_recovery_codes","table":"users","data_type":"json","default_value":null,"max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"last_login_at","table":"users","data_type":"datetime","default_value":null,"max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"created_at","table":"users","data_type":"datetime","default_value":"CURRENT_TIMESTAMP","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":false,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"updated_at","table":"users","data_type":"datetime","default_value":"CURRENT_TIMESTAMP","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":false,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null}],"foreignKeys":[]}}

this is the db data example `http://localhost:8000/api/db/${this.tableName}`,

[{"id":"2a7d381b-aec5-4c87-a2bf-2145f5283457","email":"admin@yourdomain.com","name":"Initial Admin","password_hash":"$argon2id$v=19$m=19456,t=2,p=1$Lsgy6Qz7iDrMgq4J6S7RkQ$2y7DhhQg/STJ1wZwpQegsEV+SnTj406/1yrIaQEmyRg","role":"super_admin","permissions":"[object Object]","is_super_admin":1,"last_login_at":"2025-03-19 08:10:11","created_at":"2025-03-19 08:06:46","updated_at":"2025-03-19 08:10:11"}]

this is a data table Implementation example

import { SelectionModel } from '@angular/cdk/collections';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, TrackByFunction, computed, effect, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { lucideArrowUpDown, lucideChevronDown, lucideEllipsis } from '@ng-icons/lucide';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmCheckboxComponent } from '@spartan-ng/ui-checkbox-helm';
import { HlmIconDirective, provideIcons } from '@spartan-ng/ui-icon-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { BrnMenuTriggerDirective } from '@spartan-ng/brain/menu';
import { HlmMenuModule } from '@spartan-ng/ui-menu-helm';
import { BrnTableModule, PaginatorState, useBrnColumnManager } from '@spartan-ng/brain/table';
import { HlmTableModule } from '@spartan-ng/ui-table-helm';
import { BrnSelectModule } from '@spartan-ng/brain/select';
import { HlmSelectModule } from '@spartan-ng/ui-select-helm';
import { hlmMuted } from '@spartan-ng/ui-typography-helm';
import { debounceTime, map } from 'rxjs';

export type Payment = {
id: string;
amount: number;
status: 'pending' | 'processing' | 'success' | 'failed';
email: string;
};

const PAYMENT_DATA: Payment[] = [
{
id: 'm5gr84i9',
amount: 316,
status: 'success',
email: 'ken99@yahoo.com',
},
{
id: '3u1reuv4',
amount: 242,
status: 'success',
email: 'Abe45@gmail.com',
},
];

@Component({
selector: 'spartan-data-table-preview',
standalone: true,
imports: [
FormsModule,

    BrnMenuTriggerDirective,
    HlmMenuModule,

    BrnTableModule,
    HlmTableModule,

    HlmButtonModule,

    DecimalPipe,
    TitleCasePipe,
    HlmIconDirective,
    HlmInputDirective,

    HlmCheckboxComponent,

    BrnSelectModule,
      HlmSelectModule,

],
providers: [provideIcons({ lucideChevronDown, lucideEllipsis, lucideArrowUpDown })],
host: {
class: 'w-full',
},
template: `
<div class="flex flex-col justify-between gap-4 sm:flex-row">
<input
hlmInput
class="w-full md:w-80"
placeholder="Filter emails..."
[ngModel]="\_emailFilter()"
(ngModelChange)="\_rawFilterInput.set($event)"
/>

      <button hlmBtn variant="outline" align="end" [brnMenuTriggerFor]="menu">
        Columns
        <ng-icon hlm name="lucideChevronDown" class="ml-2" size="sm" />
      </button>
      <ng-template #menu>
        <hlm-menu class="w-32">
          @for (column of _brnColumnManager.allColumns; track column.name) {
            <button
              hlmMenuItemCheckbox
              [disabled]="_brnColumnManager.isColumnDisabled(column.name)"
              [checked]="_brnColumnManager.isColumnVisible(column.name)"
              (triggered)="_brnColumnManager.toggleVisibility(column.name)"
            >
              <hlm-menu-item-check />
              <span>{{ column.label }}</span>
            </button>
          }
        </hlm-menu>
      </ng-template>
    </div>

    <brn-table
      hlm
      stickyHeader
      class="border-border mt-4 block h-[335px] overflow-auto rounded-md border"
      [dataSource]="_filteredSortedPaginatedPayments()"
      [displayedColumns]="_allDisplayedColumns()"
      [trackBy]="_trackBy"
    >
      <brn-column-def name="select" class="w-12">
        <hlm-th *brnHeaderDef>
          <hlm-checkbox [checked]="_checkboxState()" (changed)="handleHeaderCheckboxChange()" />
        </hlm-th>
        <hlm-td *brnCellDef="let element">
          <hlm-checkbox [checked]="_isPaymentSelected(element)" (changed)="togglePayment(element)" />
        </hlm-td>
      </brn-column-def>
      <brn-column-def name="status" class="w-32 sm:w-40">
        <hlm-th truncate *brnHeaderDef>Status</hlm-th>
        <hlm-td truncate *brnCellDef="let element">
          {{ element.status | titlecase }}
        </hlm-td>
      </brn-column-def>
      <brn-column-def name="email" class="w-60 lg:flex-1">
        <hlm-th *brnHeaderDef>
          <button hlmBtn size="sm" variant="ghost" (click)="handleEmailSortChange()">
            Email
            <ng-icon hlm class="ml-3" size="sm" name="lucideArrowUpDown" />
          </button>
        </hlm-th>
        <hlm-td truncate *brnCellDef="let element">
          {{ element.email }}
        </hlm-td>
      </brn-column-def>
      <brn-column-def name="amount" class="justify-end w-20">
        <hlm-th *brnHeaderDef>Amount</hlm-th>
        <hlm-td class="font-medium tabular-nums" *brnCellDef="let element">
          $ {{ element.amount | number: '1.2-2'}}
        </hlm-td>
      </brn-column-def>
      <brn-column-def name="actions" class="w-16">
        <hlm-th *brnHeaderDef></hlm-th>
        <hlm-td *brnCellDef="let element">
          <button hlmBtn variant="ghost" class="h-6 w-6 p-0.5" align="end" [brnMenuTriggerFor]="menu">
            <ng-icon hlm size="sm" name="lucideEllipsis" />
          </button>

          <ng-template #menu>
            <hlm-menu>
              <hlm-menu-label>Actions</hlm-menu-label>
              <hlm-menu-separator />
              <hlm-menu-group>
                <button hlmMenuItem>Copy payment ID</button>
              </hlm-menu-group>
              <hlm-menu-separator />
              <hlm-menu-group>
                <button hlmMenuItem>View customer</button>
                <button hlmMenuItem>View payment details</button>
              </hlm-menu-group>
            </hlm-menu>
          </ng-template>
        </hlm-td>
      </brn-column-def>
      <div class="flex items-center justify-center p-20 text-muted-foreground" brnNoDataRow>No data</div>
    </brn-table>
    <div
      class="flex flex-col justify-between mt-4 sm:flex-row sm:items-center"
      *brnPaginator="let ctx; totalElements: _totalElements(); pageSize: _pageSize(); onStateChange: _onStateChange"
    >
      <span class="text-sm text-muted-foreground text-sm">{{ _selected().length }} of {{ _totalElements() }} row(s) selected</span>
      <div class="flex mt-2 sm:mt-0">
        <brn-select class="inline-block" placeholder="{{ _availablePageSizes[0] }}" [(ngModel)]="_pageSize">
          <hlm-select-trigger class="inline-flex mr-1 w-15 h-9">
            <hlm-select-value />
          </hlm-select-trigger>
          <hlm-select-content>
            @for (size of _availablePageSizes; track size) {
              <hlm-option [value]="size">
                {{ size === 10000 ? 'All' : size }}
              </hlm-option>
            }
          </hlm-select-content>
        </brn-select>

        <div class="flex space-x-1">
          <button size="sm" variant="outline" hlmBtn [disabled]="!ctx.decrementable()" (click)="ctx.decrement()">
            Previous
          </button>
          <button size="sm" variant="outline" hlmBtn [disabled]="!ctx.incrementable()" (click)="ctx.increment()">
            Next
          </button>
        </div>
      </div>
    </div>

`,
})
export class DataTablePreviewComponent {
protected readonly \_rawFilterInput = signal('');
protected readonly \_emailFilter = signal('');
private readonly \_debouncedFilter = toSignal(toObservable(this.\_rawFilterInput).pipe(debounceTime(300)));

private readonly \_displayedIndices = signal({ start: 0, end: 0 });
protected readonly \_availablePageSizes = [5, 10, 20, 10000];
protected readonly \_pageSize = signal(this.\_availablePageSizes[0]);

private readonly \_selectionModel = new SelectionModel<Payment>(true);
protected readonly \_isPaymentSelected = (payment: Payment) => this.\_selectionModel.isSelected(payment);
protected readonly \_selected = toSignal(this.\_selectionModel.changed.pipe(map((change) => change.source.selected)), {
initialValue: [],
});

protected readonly \_brnColumnManager = useBrnColumnManager({
status: { visible: true, label: 'Status' },
email: { visible: true, label: 'Email' },
amount: { visible: true, label: 'Amount ($)' },
});
protected readonly \_allDisplayedColumns = computed(() => [
'select',
...this._brnColumnManager.displayedColumns(),
'actions',
]);

private readonly \_payments = signal(PAYMENT_DATA);
private readonly \_filteredPayments = computed(() => {
const emailFilter = this.\_emailFilter()?.trim()?.toLowerCase();
if (emailFilter && emailFilter.length > 0) {
return this.\_payments().filter((u) => u.email.toLowerCase().includes(emailFilter));
}
return this.\_payments();
});
private readonly \_emailSort = signal<'ASC' | 'DESC' | null>(null);
protected readonly \_filteredSortedPaginatedPayments = computed(() => {
const sort = this.\_emailSort();
const start = this.\_displayedIndices().start;
const end = this.\_displayedIndices().end + 1;
const payments = this.\_filteredPayments();
if (!sort) {
return payments.slice(start, end);
}
return [...payments]
.sort((p1, p2) => (sort === 'ASC' ? 1 : -1) \* p1.email.localeCompare(p2.email))
.slice(start, end);
});
protected readonly \_allFilteredPaginatedPaymentsSelected = computed(() =>
this.\_filteredSortedPaginatedPayments().every((payment) => this.\_selected().includes(payment)),
);
protected readonly \_checkboxState = computed(() => {
const noneSelected = this.\_selected().length === 0;
const allSelectedOrIndeterminate = this.\_allFilteredPaginatedPaymentsSelected() ? true : 'indeterminate';
return noneSelected ? false : allSelectedOrIndeterminate;
});

protected readonly _trackBy: TrackByFunction<Payment> = (_: number, p: Payment) => p.id;
protected readonly \_totalElements = computed(() => this.\_filteredPayments().length);
protected readonly \_onStateChange = ({ startIndex, endIndex }: PaginatorState) =>
this.\_displayedIndices.set({ start: startIndex, end: endIndex });

constructor() {
// needed to sync the debounced filter to the name filter, but being able to override the
// filter when loading new users without debounce
effect(() => {
const debouncedFilter = this.\_debouncedFilter();
untracked(() => this.\_emailFilter.set(debouncedFilter ?? ''));
});
}

protected togglePayment(payment: Payment) {
this.\_selectionModel.toggle(payment);
}

protected handleHeaderCheckboxChange() {
const previousCbState = this.\_checkboxState();
if (previousCbState === 'indeterminate' || !previousCbState) {
this.\_selectionModel.select(...this.\_filteredSortedPaginatedPayments());
} else {
this.\_selectionModel.deselect(...this.\_filteredSortedPaginatedPayments());
}
}

protected handleEmailSortChange() {
const sort = this.\_emailSort();
if (sort === 'ASC') {
this.\_emailSort.set('DESC');
} else if (sort === 'DESC') {
this.\_emailSort.set(null);
} else {
this.\_emailSort.set('ASC');
}
}
}
