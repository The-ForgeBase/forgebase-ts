import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { DatabaseService } from '../../../services/database.service';

interface TableColumn {
  name: string;
  table: string;
  data_type: string;
  default_value: string | null;
  max_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_generated: boolean;
  generation_expression: string | null;
  is_nullable: boolean;
  is_unique: boolean;
  is_primary_key: boolean;
  has_auto_increment: boolean;
  foreign_key_column: string | null;
  foreign_key_table: string | null;
}

interface TableInfo {
  columns: TableColumn[];
  foreignKeys: any[];
}

interface TableSchema {
  name: string;
  info: TableInfo;
}

@Component({
  standalone: true,
  host: {
    class: 'block w-full overflow-auto min-h-[calc(100svh-5rem)] p-6 space-y-6',
  },
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ToastModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    SelectModule,
    DropdownModule,
    ProgressSpinnerModule,
    HlmButtonModule,
  ],
  providers: [MessageService],
  styles: [
    `
      :host ::ng-deep .p-datatable {
        border: none;
      }
      :host ::ng-deep .p-datatable .p-datatable-header {
        border: none;
        padding: 0;
        background: transparent;
      }
      :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
        background-color: var(--surface-card, #ffffff);
        border-bottom: 1px solid var(--surface-border, #dee2e6);
        padding: 0.75rem 1rem;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: var(--text-color-secondary, #6c757d);
        transition: box-shadow 0.2s;
      }
      :host ::ng-deep .p-datatable .p-datatable-tbody > tr {
        background-color: var(--surface-card, #ffffff);
        transition: all 0.12s ease-in-out;
      }
      :host
        ::ng-deep
        .p-datatable
        .p-datatable-tbody
        > tr:not(.p-highlight):hover {
        background-color: var(--surface-hover, #f1f5f9);
      }
      :host
        ::ng-deep
        .p-datatable
        .p-datatable-tbody
        > tr.p-rowgroup-header
        > td {
        border-bottom: none;
      }
      :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        border-bottom: 1px solid var(--surface-border, #f1f1f1);
        padding: 0.5rem 1rem;
      }
      :host ::ng-deep .p-datatable .p-datatable-tbody > tr.row-editing {
        background-color: rgba(59, 130, 246, 0.08);
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.16);
      }
      :host ::ng-deep .p-paginator {
        background-color: transparent;
        border: none;
        padding: 0.75rem 0;
      }
      :host ::ng-deep .p-paginator .p-paginator-element {
        color: var(--text-color-secondary, #6c757d);
      }
    `,
  ],
  template: `
    <div class="flex flex-col justify-between gap-4 sm:flex-row mb-6">
      <div class="flex justify-between items-center w-full">
        <h2 class="text-2xl font-bold">{{ tableName() }} Table</h2>
        <div class="flex gap-2">
          <button
            hlmBtn
            variant="outline"
            class="text-sm font-medium shadow-sm"
          >
            Add Record
          </button>
          <button
            hlmBtn
            variant="outline"
            class="text-sm font-medium shadow-sm"
          >
            Import Data
          </button>
          <button
            hlmBtn
            variant="outline"
            class="text-sm font-medium shadow-sm"
          >
            Export Data
          </button>
        </div>
      </div>
    </div>

    <p-toast></p-toast>

    @if (loading()) {
    <div class="flex justify-center items-center h-64">
      <p-progressSpinner
        strokeWidth="4"
        fill="var(--surface-ground)"
        animationDuration=".7s"
      ></p-progressSpinner>
    </div>
    } @else {
    <div
      class="rounded-xl border shadow-sm bg-card h-fit"
      style="width:{{ tableWidth() }}px"
    >
      <p-table
        [value]="_data()"
        [tableStyle]="{ width: '100%', height: '100%' }"
        [paginator]="true"
        [rows]="pageSize()"
        [rowsPerPageOptions]="pageSizeOptions()"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        dataKey="id"
        editMode="row"
        [loading]="loading()"
        [scrollable]="true"
        styleClass="p-datatable-sm"
        [scrollHeight]="'calc(100vh - 250px)'"
      >
        <ng-template #header>
          <tr class="sticky top-0 z-10 bg-card shadow-sm">
            @for (col of tableSchema()!.info.columns; track col) { @if(col.name
            === 'id'){
            <th
              class="px-4 py-3 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b"
              style="width:50px"
            >
              {{ col.name }}
            </th>
            } @else {
            <th
              class="px-4 py-3 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b"
              style="min-width:150px; max-width:250px"
            >
              {{ col.name }}
            </th>
            } }
            <th
              class="px-4 py-3 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-l shadow-sm sticky right-0 bg-card"
              style="width:80px"
            >
              Actions
            </th>
          </tr>
        </ng-template>

        <ng-template #body let-row let-editing="editing" let-ri="rowIndex">
          <tr
            class="border-b transition-colors hover:bg-muted/30"
            [ngClass]="{
              'row-editing bg-blue-50/80 dark:bg-blue-900/10': editing
            }"
            [pEditableRow]="row"
          >
            @for (col of tableSchema()!.info.columns; track col) { @if(col.name
            === 'id'){
            <td
              class="px-4 py-3 align-middle text-sm overflow-hidden truncate"
              style="width:50px"
            >
              <p
                class="font-medium text-primary inline-block truncate overflow-hidden"
              >
                {{ row[col.name] }}
              </p>
            </td>
            } @else {
            <td
              class="px-4 py-3 align-middle text-sm"
              style="min-width:150px; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
            >
              <p-cellEditor>
                <ng-template pTemplate="input">
                  <input
                    pInputText
                    type="text"
                    [(ngModel)]="row[col.name]"
                    class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </ng-template>
                <ng-template pTemplate="output">
                  <p class="truncate font-mono text-sm">
                    {{ row[col.name] }}
                  </p>
                </ng-template>
              </p-cellEditor>
            </td>
            } }
            <td
              class="px-4 py-3 align-middle text-center border-l shadow-sm sticky right-0 bg-card"
              style="width:80px"
            >
              <div class="flex items-center justify-center gap-1">
                <button
                  *ngIf="!editing"
                  pButton
                  pRipple
                  type="button"
                  pInitEditableRow
                  icon="pi pi-pencil"
                  (click)="onRowEditInit(row)"
                  class="p-button-rounded p-button-text p-button-sm"
                  aria-label="Edit"
                ></button>
                <button
                  *ngIf="editing"
                  pButton
                  pRipple
                  type="button"
                  pSaveEditableRow
                  icon="pi pi-check"
                  (click)="onRowEditSave(row)"
                  class="p-button-rounded p-button-success p-button-sm"
                  aria-label="Save"
                ></button>
                <button
                  *ngIf="editing"
                  pButton
                  pRipple
                  type="button"
                  pCancelEditableRow
                  icon="pi pi-times"
                  (click)="onRowEditCancel(row, ri)"
                  class="p-button-rounded p-button-danger p-button-sm"
                  aria-label="Cancel"
                ></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
    }
  `,
})
export default class TablesComponentPage {
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private databaseService = inject(DatabaseService);

  tableName = signal<string>(this.route.snapshot.params['table']);
  tableWidth = computed(() => {
    return this.databaseService.containerWidth() - 50;
  });
  tableSchema = signal<TableSchema | null>(null);
  loading = computed(() => {
    return !this.tableSchema();
  });
  _data = signal<any[]>([]);
  clonedData: { [s: string]: any } = {};

  /**
   * Dynamically generated page size options for the data table.
   * Calculated based on the data size and best practices for pagination.
   * @returns An array of number options for rows per page.
   */
  pageSizeOptions = computed(() => {
    const totalRecords = this._data()?.length || 0;

    // Base options always available
    const baseOptions = [10, 20, 50];

    // For smaller tables (<50 records), don't need large page sizes
    if (totalRecords < 50) {
      return baseOptions.filter((size) => size <= totalRecords || size === 10);
    }

    // For medium tables, include standard options
    if (totalRecords < 200) {
      return [...baseOptions, 100];
    }

    // For large tables, include larger page size options
    const largeOptions = [...baseOptions, 100];

    // Add "all" option (represented by the total record count)
    // only if reasonable (less than 1000 records)
    if (totalRecords < 1000) {
      largeOptions.push(totalRecords);
    } else {
      // For very large datasets, add some larger increments
      largeOptions.push(250, 500);
    }

    return largeOptions;
  });

  /**
   * Default page size for the data table.
   * Uses a sensible default based on the dataset size.
   */
  pageSize = computed(() => {
    const totalRecords = this._data()?.length || 0;

    // For very small datasets, show all records
    if (totalRecords <= 10) return totalRecords || 10;

    // For small to medium datasets
    if (totalRecords < 100) return 20;

    // Default for large datasets
    return 50;
  });

  constructor() {
    this.loadTableSchema();

    this.route.params.subscribe((params) => {
      this.tableName.set(params['table']);
      this.loadTableSchema();
    });
  }

  async loadTableSchema() {
    try {
      const [dataResponse, schemaResponse] = await Promise.all([
        fetch(`http://localhost:8000/api/db/${this.tableName()}`, {
          credentials: 'include',
        }),
        fetch(
          `http://localhost:8000/api/db/schema/tables/${this.tableName()}`,
          {
            credentials: 'include',
          }
        ),
      ]);

      const [data, schema] = await Promise.all([
        dataResponse.json(),
        schemaResponse.json(),
      ]);

      if (!dataResponse.ok || !schemaResponse.ok) {
        console.log(data);
        console.log(schema);
        throw new Error('Failed to load table data');
      }

      // console.log(data);
      this._data.set(data);
      this.tableSchema.set(schema);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load table data',
      });
    }
  }

  onRowEditInit(row: any) {
    this.clonedData[row.id] = { ...row };
  }

  onRowEditSave(row: any) {
    delete this.clonedData[row.id];
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Row updated successfully',
    });
  }

  onRowEditCancel(row: any, index: number) {
    this._data.update((data) => {
      const newData = [...data];
      newData[index] = this.clonedData[row.id];
      return newData;
    });
    delete this.clonedData[row.id];
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Edit cancelled',
    });
  }
}
