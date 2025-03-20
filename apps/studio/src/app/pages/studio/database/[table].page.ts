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
  template: `
    <div class="flex flex-col justify-between gap-4 sm:flex-row">
      <div class="flex justify-between items-center w-full">
        <h2 class="text-2xl font-bold">{{ tableName() }} Table</h2>
        <div class="flex gap-2">
          <button hlmBtn variant="outline">Add Record</button>
          <button hlmBtn variant="outline">Import Data</button>
          <button hlmBtn variant="outline">Export Data</button>
        </div>
      </div>
    </div>

    <p-toast></p-toast>

    @if (loading()) {
    <div class="flex justify-center items-center h-64">
      <p-progressSpinner></p-progressSpinner>
    </div>
    } @else {
    <div
      class="rounded-md border shadow-sm inline-block"
      style="width:{{ tableWidth() }}px"
    >
      <p-table
        [value]="_data()"
        [tableStyle]="{ width: '100%', height: '100%' }"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[5, 10, 20, 50]"
        [showCurrentPageReport]="true"
        dataKey="id"
        editMode="row"
        [loading]="loading()"
        [scrollable]="true"
        styleClass="min-w-full max-w-[100%]"
      >
        <ng-template #header>
          <tr class="bg-muted/50">
            @for (col of tableSchema()!.info.columns; track col) { @if(col.name
            === 'id'){
            <th
              class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
              style="width:80px"
            >
              {{ col.name }}
            </th>
            } @else {
            <th
              class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
              style="min-width:120px; max-width:200px"
            >
              {{ col.name }}
            </th>
            } }
            <th
              class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
              style="width:80px"
            ></th>
          </tr>
        </ng-template>

        <ng-template #body let-row let-editing="editing" let-ri="rowIndex">
          <tr
            class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            [pEditableRow]="row"
          >
            @for (col of tableSchema()!.info.columns; track col) { @if(col.name
            === 'id'){
            <td
              class="p-4 align-middle [&:has([role=checkbox])]:pr-0"
              style="width:80px"
            >
              {{ row[col.name] }}
            </td>
            } @else {
            <td
              class="p-4 align-middle [&:has([role=checkbox])]:pr-0"
              style="min-width:120px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
            >
              <p-cellEditor>
                <ng-template pTemplate="input">
                  <input
                    pInputText
                    type="text"
                    [(ngModel)]="row[col.name]"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </ng-template>
                <ng-template pTemplate="output">
                  <div class="truncate">{{ row[col.name] }}</div>
                </ng-template>
              </p-cellEditor>
            </td>
            } }
            <td
              class="p-4 align-middle [&:has([role=checkbox])]:pr-0"
              style="width:80px"
            >
              <div class="flex items-center justify-center gap-2">
                <button
                  *ngIf="!editing"
                  pButton
                  pRipple
                  type="button"
                  pInitEditableRow
                  icon="pi pi-pencil"
                  (click)="onRowEditInit(row)"
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 p-0"
                ></button>
                <button
                  *ngIf="editing"
                  pButton
                  pRipple
                  type="button"
                  pSaveEditableRow
                  icon="pi pi-check"
                  (click)="onRowEditSave(row)"
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10 p-0"
                ></button>
                <button
                  *ngIf="editing"
                  pButton
                  pRipple
                  type="button"
                  pCancelEditableRow
                  icon="pi pi-times"
                  (click)="onRowEditCancel(row, ri)"
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 w-10 p-0"
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
