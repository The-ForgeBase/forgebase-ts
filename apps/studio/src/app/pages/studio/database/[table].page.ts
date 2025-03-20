import {
  Component,
  computed,
  effect,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { animate, style, transition, trigger } from '@angular/animations';

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

/**
 * TablesComponentPage displays and manages database table data in a modern, interactive UI.
 * Features include:
 * - Dynamic data loading with loading indicators
 * - Inline data editing with optimistic updates
 * - Empty state handling
 * - Responsive layout with proper desktop and mobile views
 *
 * @example
 * <tables-component-page></tables-component-page>
 */
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
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '200ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('fadeInTable', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms 100ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
  styles: [
    `
      :host {
        --table-header-bg: var(--surface-card, #ffffff);
        --table-row-hover: var(--surface-hover, rgba(0, 0, 0, 0.03));
        --table-row-active: rgba(59, 130, 246, 0.08);
        --table-border: var(--surface-border, rgba(0, 0, 0, 0.05));
      }

      :host ::ng-deep .p-datatable {
        border: none;
        border-radius: 1rem;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.04);
      }

      :host ::ng-deep .p-datatable .p-datatable-header {
        border: none;
        padding: 0;
        background: transparent;
      }

      :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
        background-color: var(--table-header-bg);
        border-bottom: 1px solid var(--table-border);
        padding: 0.875rem 1.25rem;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: var(--text-color-secondary, #64748b);
        transition: box-shadow 0.2s, background-color 0.2s;
      }

      :host ::ng-deep .p-datatable .p-datatable-thead > tr > th:first-child {
        border-top-left-radius: 0.5rem;
      }

      :host ::ng-deep .p-datatable .p-datatable-thead > tr > th:last-child {
        border-top-right-radius: 0.5rem;
      }

      :host ::ng-deep .p-datatable .p-datatable-tbody > tr {
        background-color: var(--surface-card, #ffffff);
        transition: all 0.15s ease-in-out;
      }

      :host
        ::ng-deep
        .p-datatable
        .p-datatable-tbody
        > tr:not(.p-highlight):hover {
        background-color: var(--table-row-hover);
      }

      :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        border-bottom: 1px solid var(--table-border);
        padding: 0.75rem 1.25rem;
      }

      :host ::ng-deep .p-datatable .p-datatable-tbody > tr:last-child > td {
        border-bottom: none;
      }

      :host
        ::ng-deep
        .p-datatable
        .p-datatable-tbody
        > tr:last-child
        > td:first-child {
        border-bottom-left-radius: 0.5rem;
      }

      :host
        ::ng-deep
        .p-datatable
        .p-datatable-tbody
        > tr:last-child
        > td:last-child {
        border-bottom-right-radius: 0.5rem;
      }

      :host ::ng-deep .p-datatable .p-datatable-tbody > tr.row-editing {
        background-color: var(--table-row-active);
        box-shadow: inset 0 0 0 1.5px rgba(59, 130, 246, 0.5);
        z-index: 1;
      }

      :host ::ng-deep .p-paginator {
        background-color: transparent;
        border: none;
        padding: 1rem 0;
      }

      :host ::ng-deep .p-paginator .p-paginator-element {
        border-radius: 0.5rem;
        min-width: 2.25rem;
        height: 2.25rem;
        margin: 0 0.125rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      :host ::ng-deep .p-datatable-emptymessage td {
        text-align: center;
        padding: 3rem 0;
        background-color: transparent !important;
        border: none !important;
      }

      .table-header-container {
        background: linear-gradient(
          to right,
          rgba(255, 255, 255, 0.01),
          rgba(255, 255, 255, 0.1)
        );
        backdrop-filter: blur(8px);
        border-radius: 1rem 1rem 0 0;
        border-bottom: 1px solid var(--table-border);
      }

      .data-pill {
        display: inline-flex;
        align-items: center;
        background-color: rgba(59, 130, 246, 0.08);
        color: rgb(29, 78, 216);
        border-radius: 9999px;
        padding: 0.25rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        margin-right: 0.5rem;
      }

      .action-buttons {
        position: relative;
        z-index: 10;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        border-radius: 0.75rem;
        padding: 0.5rem;
      }

      :host ::ng-deep .p-button.p-button-sm {
        width: 2rem;
        height: 2rem;
      }

      :host ::ng-deep .p-inputtext:focus {
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
      }

      .type-badge {
        font-size: 0.65rem;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        background: rgba(0, 0, 0, 0.05);
        color: rgba(0, 0, 0, 0.6);
        margin-left: 0.5rem;
        font-weight: 500;
      }

      .edit-input-container {
        position: relative;
      }

      .edit-input-container::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -2px;
        height: 2px;
        background: rgb(59, 130, 246);
        transform: scaleX(0);
        transition: transform 0.15s ease-in-out;
      }

      .edit-input-container:focus-within::after {
        transform: scaleX(1);
      }
    `,
  ],
  template: `
    <div *ngIf="isBrowser()" @fadeIn class="space-y-8">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight">
            {{ tableName() }}
            <span class="text-muted-foreground font-normal text-base"
              >table</span
            >
          </h1>

          <div *ngIf="_data().length" class="data-pill">
            {{ _data().length }} Records
          </div>
        </div>

        <div class="flex gap-2 sm:gap-3 action-buttons">
          <button hlmBtn variant="default" class="text-sm font-medium px-4 h-9">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="mr-1.5"
            >
              <path d="M12 5v14"></path>
              <path d="M5 12h14"></path>
            </svg>
            Add Record
          </button>

          <button hlmBtn variant="outline" class="text-sm font-medium h-9">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="mr-1.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Import
          </button>

          <button hlmBtn variant="outline" class="text-sm font-medium h-9">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="mr-1.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Export
          </button>
        </div>
      </div>

      <div class="w-full flex gap-3">
        <button hlmBtn variant="outline" class="text-sm font-medium h-9">
          Table Settings
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="ml-2"
          >
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h16"></path>
            <path d="M4 6v12"></path>
            <path d="M20 6v12"></path>
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h16"></path>
            <path d="M4 6v12"></path>
            <path d="M20 6v12"></path>
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h16"></path>
            <path d="M4 6v12"></path>
            <path d="M20 6v12"></path>
            <path d="M4 6h16"></path>
          </svg>
        </button>
        <button hlmBtn variant="outline" class="text-sm font-medium h-9">
          Table Permissions
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="ml-2"
          >
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h16"></path>
            <path d="M4 6v12"></path>
            <path d="M20 6v12"></path>
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h16"></path>
            <path d="M4 6v12"></path>
            <path d="M20 6v12"></path>
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h16"></path>
            <path d="M4 6v12"></path>
          </svg>
        </button>
      </div>

      <p-toast position="top-right" styleClass="custom-toast"></p-toast>

      @if (loading()) {
      <div class="flex flex-col justify-center items-center h-64 space-y-4">
        <p-progressSpinner
          strokeWidth="4"
          fill="var(--surface-ground)"
          animationDuration=".7s"
          styleClass="w-14 h-14"
        ></p-progressSpinner>
        <p class="text-sm text-muted-foreground">
          Loading {{ tableName() }} data...
        </p>
      </div>
      } @else {
      <div
        @fadeInTable
        class="rounded-xl border bg-card shadow-sm overflow-hidden"
        [style.width]="tableWidth() + 'px'"
      >
        <p-table
          [value]="_data()"
          [tableStyle]="{ width: '100%' }"
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
          [rowHover]="true"
          responsiveLayout="scroll"
        >
          <ng-template #header>
            <tr class="sticky top-0 z-10 bg-card shadow-sm">
              @for (col of tableSchema()!.info.columns; track col) {
              @if(col.name === 'id') {
              <th
                class="px-5 py-3.5 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b flex items-center gap-1.5"
                style="min-width:150px; max-width:250px"
              >
                <span>{{ col.name }}</span>
                @if(col.is_primary_key) {
                <span
                  class="text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-full"
                  >PK</span
                >
                } @if (col.has_auto_increment) {
                <span
                  class="text-green-600 text-[10px] bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full"
                  >AUTO</span
                >
                } @if(col.is_unique) {
                <span
                  class="text-orange-600 text-[10px] bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded-full"
                  >UNIQUE</span
                >
                } @if(col.foreign_key_table) {
                <span
                  class="text-violet-600 text-[10px] bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded-full"
                  >FK</span
                >
                }
              </th>
              } @else {
              <th
                class="px-5 py-3.5 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b"
                style="min-width:150px; max-width:250px"
              >
                <div class="flex items-center gap-1.5">
                  <span>{{ col.name }}</span>
                  @if(col.is_primary_key) {
                  <span
                    class="text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-full"
                    >PK</span
                  >
                  } @if(col.is_unique) {
                  <span
                    class="text-orange-600 text-[10px] bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded-full"
                    >UNIQUE</span
                  >
                  } @if(col.foreign_key_table) {
                  <span
                    class="text-violet-600 text-[10px] bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded-full"
                    >FK</span
                  >
                  } @if (col.has_auto_increment) {
                  <span
                    class="text-green-600 text-[10px] bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full"
                    >AUTO</span
                  >
                  }
                </div>
              </th>
              } }
              <th
                class="px-5 py-3.5 text-center align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-l shadow-sm sticky right-0 bg-card"
                style="width:120px"
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
              @for (col of tableSchema()!.info.columns; track col) {
              @if(col.name === 'id') {
              <td
                class="px-5 py-3.5 align-middle text-sm"
                style="min-width:150px; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
              >
                <p
                  class="font-medium text-primary flex items-center truncate overflow-hidden"
                >
                  {{ row[col.name] }}
                  <span class="type-badge hidden sm:inline-block">{{
                    col.data_type
                  }}</span>
                </p>
              </td>
              } @else {
              <td
                class="px-5 py-3.5 align-middle text-sm"
                style="min-width:150px; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
              >
                <p-cellEditor>
                  <ng-template pTemplate="input">
                    <div class="edit-input-container">
                      <input
                        pInputText
                        type="text"
                        [(ngModel)]="row[col.name]"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary"
                      />
                      <span
                        class="absolute right-2 top-2 text-[10px] text-muted-foreground"
                      >
                        {{ col.data_type }}
                      </span>
                    </div>
                  </ng-template>
                  <ng-template pTemplate="output">
                    <div class="flex items-center">
                      <p
                        class="truncate font-mono text-sm mr-1"
                        [ngClass]="{
                          'text-muted-foreground': row[col.name] === null
                        }"
                      >
                        {{ row[col.name] !== null ? row[col.name] : 'null' }}
                      </p>
                      <span class="type-badge hidden sm:inline-block">{{
                        col.data_type
                      }}</span>
                    </div>
                  </ng-template>
                </p-cellEditor>
              </td>
              } }
              <td
                class="px-4 py-2 align-middle text-center border-l shadow-sm sticky right-0 bg-card"
                style="width:120px"
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
                  <button
                    pButton
                    pRipple
                    type="button"
                    icon="pi pi-trash"
                    class="p-button-rounded p-button-danger p-button-sm"
                    aria-label="Delete"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>

          <!-- Empty state template -->
          <ng-template pTemplate="emptymessage">
            <tr>
              <td
                [attr.colspan]="(tableSchema()!.info.columns.length || 0) + 1"
              >
                <div
                  class="flex flex-col items-center justify-center py-16 px-4"
                >
                  <div class="bg-muted/30 rounded-full p-5 mb-6 shadow-inner">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-muted-foreground h-10 w-10"
                    >
                      <path
                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                      ></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <h3 class="text-xl font-semibold mb-2">No Records Found</h3>
                  <p
                    class="text-sm text-muted-foreground text-center mb-8 max-w-md"
                  >
                    {{
                      hasDataBeenFetched()
                        ? 'The table is empty. Add a new record to get started.'
                        : 'There was a problem fetching data from this table.'
                    }}
                  </p>
                  <button
                    hlmBtn
                    variant="default"
                    size="lg"
                    class="text-sm font-medium px-8"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="mr-2"
                    >
                      <path d="M12 5v14"></path>
                      <path d="M5 12h14"></path>
                    </svg>
                    Add First Record
                  </button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      }
    </div>
  `,
})
export default class TablesComponentPage {
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private databaseService = inject(DatabaseService);
  private platformId = inject(PLATFORM_ID);

  tableName = signal<string>(this.route.snapshot.params['table']);
  tableWidth = computed(() => {
    return this.databaseService.containerWidth() - 60;
  });
  tableSchema = signal<TableSchema | null>(null);
  loading = computed(() => {
    return !this.tableSchema();
  });
  _data = signal<any[]>([]);
  clonedData: { [s: string]: any } = {};

  isBrowser = signal<boolean>(isPlatformBrowser(this.platformId));

  /**
   * Tracks if data has been successfully fetched, even if the result is empty.
   * Used to differentiate between an intentionally empty table and a fetch failure.
   */
  private dataFetchComplete = signal<boolean>(false);

  /**
   * Indicates whether data has been successfully fetched, regardless of result.
   * This helps determine if the table is truly empty vs failed to fetch.
   * @returns {boolean} True if data has been fetched, otherwise false
   */
  hasDataBeenFetched = computed(() => this.dataFetchComplete());

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

  /**
   * Constructor initializes the component and sets up subscriptions
   */
  constructor() {
    this.loadTableSchema();

    this.route.params.subscribe((params) => {
      this.tableName.set(params['table']);
      this.loadTableSchema();
    });

    // Only run in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.isBrowser.set(true);
      const style = document.createElement('style');
      style.innerHTML = `
          .custom-toast .p-toast-message {
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
          .custom-toast .p-toast-message-success {
            background-color: #ecfdf5;
            border-left: 6px solid #10b981;
            color: #064e3b;
          }
          .custom-toast .p-toast-message-info {
            background-color: #eff6ff;
            border-left: 6px solid #3b82f6;
            color: #1e40af;
          }
          .custom-toast .p-toast-message-error {
            background-color: #fef2f2;
            border-left: 6px solid #ef4444;
            color: #991b1b;
          }
        `;
      document.head.appendChild(style);
    }
  }

  /**
   * Loads the table schema and data from the API
   * Sets dataFetchComplete signal to true when complete, even if the fetch returns empty data
   */
  async loadTableSchema() {
    try {
      // Reset fetch status when starting a new load
      this.dataFetchComplete.set(false);

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

      // Update component state with fetched data and schema
      this._data.set(data);
      this.tableSchema.set(schema);
      //console.log('Table schema:', schema);

      // Mark fetch as complete, regardless of whether data is empty or not
      this.dataFetchComplete.set(true);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load table data',
      });
      // Even on error, we've attempted the fetch
      this.dataFetchComplete.set(true);
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
