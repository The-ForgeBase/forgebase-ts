import {
  Component,
  computed,
  effect,
  inject,
  signal,
  PLATFORM_ID,
  ViewChild,
  viewChild,
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
import { DialogModule } from 'primeng/dialog';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmDialogModule } from '@spartan-ng/ui-dialog-helm';
import { BrnDialogModule } from '@spartan-ng/brain/dialog';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { DatabaseService } from '../../../services/database.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { DynamicInputComponent } from '../../../components/dynamic-input/dynamic-input.component';
import { UseClientDirective } from '../../../shared/directives';
import { TablePermissions, TableSchema } from '../../../shared/types/database';
import {
  BrnSheetComponent,
  BrnSheetContentDirective,
  BrnSheetTriggerDirective,
} from '@spartan-ng/brain/sheet';
import { TablePermissionsComponent } from '../components/table/table-permissions.component';
import {
  HlmSheetComponent,
  HlmSheetContentComponent,
  HlmSheetDescriptionDirective,
  HlmSheetHeaderComponent,
  HlmSheetTitleDirective,
} from '@spartan-ng/ui-sheet-helm';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import { NgScrollbarModule } from 'ngx-scrollbar';

/**
 * TablesComponentPage displays and manages database table data in a modern, interactive UI.
 * Features include:
 * - Dynamic data loading with loading indicators
 * - Inline data editing with optimistic updates
 * - Empty state handling
 * - Responsive layout with proper desktop and mobile views
 * - Add record functionality
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
    DialogModule,
    HlmDialogModule,
    BrnDialogModule,
    DynamicInputComponent,
    HlmLabelDirective,
    UseClientDirective,
    TablePermissionsComponent,
    HlmScrollAreaDirective,
    NgScrollbarModule,
    BrnSheetContentDirective,
    HlmSheetComponent,
    HlmSheetContentComponent,
    HlmSheetHeaderComponent,
    HlmSheetTitleDirective,
    HlmSheetDescriptionDirective,
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
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css'],
})
export default class TablesComponentPage {
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private databaseService = inject(DatabaseService);
  private platformId = inject(PLATFORM_ID);

  /**
   * Controls visibility of the Add Record dialog
   */
  addRecordDialogVisible = signal(false);

  /**
   * Tracks the loading state when adding a new record
   */
  isAddingRecord = signal(false);

  /**
   * Holds the new record data for the form
   */
  newRecord: Record<string, any> = {};

  tableName = signal<string>(this.route.snapshot.params['table']);
  tableWidth = computed(() => {
    return this.databaseService.containerWidth() - 60;
  });
  tableSchema = signal<TableSchema | null>(null);
  tablePermissions = signal<TablePermissions | undefined>(undefined);
  loading = computed(() => {
    return !this.tableSchema() && !this.tablePermissions();
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
      this.addRecordDialogVisible.set(false);
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

      const [dataResponse, schemaResponse, permissionsResponse] =
        await Promise.all([
          fetch(`http://localhost:8000/api/db/${this.tableName()}`, {
            credentials: 'include',
          }),
          fetch(
            `http://localhost:8000/api/db/schema/tables/${this.tableName()}`,
            {
              credentials: 'include',
            }
          ),
          fetch(
            `http://localhost:8000/api/db/schema/permissions/${this.tableName()}`,
            {
              credentials: 'include',
            }
          ),
        ]);

      const [data, schema, permissions] = await Promise.all([
        dataResponse.json(),
        schemaResponse.json(),
        permissionsResponse.json(),
      ]);

      if (!dataResponse.ok || !schemaResponse.ok || !permissionsResponse.ok) {
        console.log(data);
        console.log(schema);
        console.log(permissions);
        throw new Error('Failed to load table data');
      }

      // Update component state with fetched data and schema
      this.tableSchema.set(schema);
      this._data.set(data);
      this.tablePermissions.set(permissions);
      // console.log('Table schema:', schema);
      // console.log('Table data:', data);
      // console.log('Table permissions:', permissions);

      // Mark fetch as complete, regardless of whether data is empty or not
      this.dataFetchComplete.set(true);
    } catch (error) {
      console.error('Error loading table schema:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load table data',
      });
      // Even on error, we've attempted the fetch
      this.dataFetchComplete.set(true);
    }
  }

  /**
   * Opens the Add Record dialog and initializes a new empty record
   */
  openAddRecordDialog(): void {
    // Initialize empty record
    this.resetNewRecord();
    this.addRecordDialogVisible.set(true);
  }

  /**
   * Resets the new record object to initial empty state
   */
  private resetNewRecord(): void {
    this.newRecord = {};

    // Pre-populate with nulls for nullable fields
    if (this.tableSchema()) {
      for (const col of this.tableSchema()!.info.columns) {
        if (!col.has_auto_increment && !col.is_generated) {
          this.newRecord[col.name] = col.is_nullable ? null : '';
        }
      }
    }
  }

  /**
   * Adds a new record to the table
   * Currently implements optimistic UI updates without backend integration
   */
  async addRecord(): Promise<void> {
    if (!this.tableSchema()) return;

    try {
      this.isAddingRecord.set(true);

      // For now, simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Optimistic update: Add the record to local state
      const newId = this.getNextAvailableId();
      const record = {
        ...this.newRecord,
        id: newId,
      };

      // Add to data
      this._data.update((current) => {
        const updated = [...current];
        updated.unshift(record);
        return updated;
      });

      // Close dialog
      this.addRecordDialogVisible.set(false);

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Record added successfully',
      });

      // Reset form
      this.resetNewRecord();
    } catch (error) {
      console.error('Error adding record:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add record',
      });
    } finally {
      this.isAddingRecord.set(false);
    }
  }

  /**
   * Gets next available ID for new records
   * This is a temporary implementation for local testing
   * @returns {number} The next available ID
   */
  private getNextAvailableId(): number {
    const data = this._data();
    if (!data || data.length === 0) return 1;

    const maxId = Math.max(
      ...data.map((item) =>
        typeof item.id === 'number' ? item.id : parseInt(item.id, 10) || 0
      )
    );

    return maxId + 1;
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

  public permissionsSheetRef = viewChild<BrnSheetComponent>(
    'permissionsSheetRef'
  );

  openPermissionsSheet() {
    this.permissionsSheetRef()?.open();
  }

  async closePermissionsSheet(event: TablePermissions | null) {
    if (!event) {
      this.permissionsSheetRef()?.close({});
      return;
    }
    console.log('Permissions:', event);
    try {
      const pres = await fetch(
        `http://localhost:8000/api/db/schema/permissions/${this.tableName()}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      const res = await pres.json();
      if (pres.ok) {
        console.log('Permissions updated:', res);
        this.tablePermissions.set(res);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Permissions updated successfully',
        });
        this.permissionsSheetRef()?.close({});
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: res.error,
        });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update permissions',
      });
    }
  }
}
