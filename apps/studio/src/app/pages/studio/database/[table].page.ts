import { SelectionModel } from '@angular/cdk/collections';
import {
  Component,
  TrackByFunction,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  lucideArrowUpDown,
  lucideChevronDown,
  lucideEllipsis,
} from '@ng-icons/lucide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmCheckboxComponent } from '@spartan-ng/ui-checkbox-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { BrnMenuTriggerDirective } from '@spartan-ng/brain/menu';
import { HlmMenuModule } from '@spartan-ng/ui-menu-helm';
import {
  BrnTableModule,
  PaginatorState,
  useBrnColumnManager,
} from './utils/src';
import { HlmTableModule } from '@spartan-ng/ui-table-helm';
import { BrnSelectModule } from '@spartan-ng/brain/select';
import { HlmSelectModule } from '@spartan-ng/ui-select-helm';
import { debounceTime, map } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

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
  imports: [
    NgIcon,
    FormsModule,
    BrnMenuTriggerDirective,
    HlmMenuModule,
    BrnTableModule,
    HlmTableModule,
    HlmButtonModule,
    HlmIconDirective,
    HlmInputDirective,
    HlmCheckboxComponent,
    BrnSelectModule,
    HlmSelectModule,
  ],
  providers: [
    provideIcons({ lucideChevronDown, lucideEllipsis, lucideArrowUpDown }),
  ],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex flex-col justify-between gap-4 sm:flex-row">
        <div class="flex justify-between items-center w-full">
          <h2 class="text-2xl font-bold">{{ tableName }} Table</h2>
          <div class="space-x-2">
            <button hlmBtn variant="outline">Add Record</button>
            <button hlmBtn variant="outline">Import Data</button>
            <button hlmBtn variant="outline">Export Data</button>
          </div>
        </div>
      </div>
      @if (loading()) {
      <div class="flex justify-center items-center h-64">
        <div
          class="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-gray-200"
        ></div>
      </div>
      } @else {
      <div class="flex flex-col justify-between gap-4 sm:flex-row">
        <input
          hlmInput
          class="w-full md:w-80"
          placeholder="Filter..."
          [ngModel]="_filter()"
          (ngModelChange)="_rawFilterInput.set($event)"
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
        class="border-border mt-4 block h-[500px] overflow-auto rounded-md border"
        [dataSource]="_filteredSortedPaginatedData()"
        [displayedColumns]="_allDisplayedColumns()"
        [trackBy]="_trackBy"
      >
        <brn-column-def name="select" class="w-12">
          <hlm-th *brnHeaderDef>
            <hlm-checkbox
              [checked]="_checkboxState()"
              (changed)="handleHeaderCheckboxChange()"
            />
          </hlm-th>
          <hlm-td *brnCellDef="let element">
            <hlm-checkbox
              [checked]="_isRowSelected(element)"
              (changed)="toggleRow(element)"
            />
          </hlm-td>
        </brn-column-def>
        @for (column of tableSchema()!.info.columns; track column.name) {
        <brn-column-def [dynamic]="true" [name]="column.name">
          <hlm-th *brnHeaderDef>
            <button
              hlmBtn
              size="sm"
              variant="ghost"
              (click)="handleSortChange(column.name)"
            >
              {{ column.name }}
              <ng-icon hlm class="ml-3" size="sm" name="lucideArrowUpDown" />
            </button>
            <div class="text-xs text-muted-foreground">
              {{ column.data_type }}
            </div>
          </hlm-th>
          <hlm-td *brnCellDef="let element">
            {{ element[column.name] }}
          </hlm-td>
        </brn-column-def>
        }

        <brn-column-def name="actions" class="w-16">
          <hlm-th *brnHeaderDef></hlm-th>
          <hlm-td *brnCellDef="let element">
            <button
              hlmBtn
              variant="ghost"
              class="h-8 w-8 p-0"
              [brnMenuTriggerFor]="rowMenu"
            >
              <ng-icon hlm size="sm" name="lucideEllipsis" />
            </button>

            <ng-template #rowMenu>
              <hlm-menu>
                <hlm-menu-group>
                  <button hlmMenuItem>Edit</button>
                  <button hlmMenuItem class="text-destructive">Delete</button>
                </hlm-menu-group>
              </hlm-menu>
            </ng-template>
          </hlm-td>
        </brn-column-def>

        <div
          class="flex items-center justify-center p-20 text-muted-foreground"
          brnNoDataRow
        >
          No data
        </div>
      </brn-table>

      <div
        class="flex flex-col justify-between mt-4 sm:flex-row sm:items-center"
        *brnPaginator="
          let ctx;
          totalElements: _totalElements();
          pageSize: _pageSize();
          onStateChange: _onStateChange
        "
      >
        <span class="text-sm text-muted-foreground"
          >{{ _selected().length }} of {{ _totalElements() }} row(s)
          selected</span
        >
        <div class="flex mt-2 sm:mt-0">
          <brn-select
            class="inline-block"
            placeholder="{{ _availablePageSizes[0] }}"
            [(ngModel)]="_pageSize"
          >
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
            <button
              size="sm"
              variant="outline"
              hlmBtn
              [disabled]="!ctx.decrementable()"
              (click)="ctx.decrement()"
            >
              Previous
            </button>
            <button
              size="sm"
              variant="outline"
              hlmBtn
              [disabled]="!ctx.incrementable()"
              (click)="ctx.increment()"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `,
})
export default class TablesComponentPage {
  private route = inject(ActivatedRoute);
  tableName = this.route.snapshot.params['table'];
  tableSchema = signal<TableSchema | null>(null);
  loading = computed(() => {
    return !this.tableSchema();
  });

  protected readonly _rawFilterInput = signal('');
  protected readonly _filter = signal('');
  private readonly _debouncedFilter = toSignal(
    toObservable(this._rawFilterInput).pipe(debounceTime(300))
  );

  private readonly _displayedIndices = signal({ start: 0, end: 0 });
  protected readonly _availablePageSizes = [5, 10, 20, 10000];
  protected readonly _pageSize = signal(this._availablePageSizes[0]);

  private readonly _selectionModel = new SelectionModel<any>(true);
  protected readonly _isRowSelected = (row: any) =>
    this._selectionModel.isSelected(row);
  protected readonly _selected = toSignal(
    this._selectionModel.changed.pipe(map((change) => change.source.selected)),
    {
      initialValue: [],
    }
  );

  private readonly _columnConfig = computed(() => {
    const schema = this.tableSchema();
    if (!schema) return {};

    return schema.info.columns.reduce((acc, column) => {
      acc[column.name] = { visible: true, label: column.name };
      return acc;
    }, {} as Record<string, { visible: boolean; label: string }>);
  });

  protected readonly _brnColumnManager = useBrnColumnManager({
    select: { visible: true, label: 'Select' },
    actions: { visible: true, label: 'Actions' },
    ...this._columnConfig(),
  });
  protected readonly _allDisplayedColumns = computed<any[]>(() => [
    'select',
    ...this._brnColumnManager.displayedColumns(),
    'actions',
  ]);

  private readonly _data = signal<any[]>([]);
  private readonly _filteredData = computed(() => {
    const filter = this._filter()?.trim()?.toLowerCase();
    if (filter && filter.length > 0) {
      return this._data().filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(filter)
        )
      );
    }
    return this._data();
  });

  private readonly _sortColumn = signal<string | null>(null);
  private readonly _sortDirection = signal<'ASC' | 'DESC' | null>(null);

  protected readonly _filteredSortedPaginatedData = computed(() => {
    const sort = this._sortDirection();
    const column = this._sortColumn();
    const start = this._displayedIndices().start;
    const end = this._displayedIndices().end + 1;
    const data = this._filteredData();

    // console.log('data', data);

    if (!sort || !column) {
      return data.slice(start, end);
    }

    return [...data]
      .sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        return (
          (sort === 'ASC' ? 1 : -1) * String(aVal).localeCompare(String(bVal))
        );
      })
      .slice(start, end);
  });

  protected readonly _allFilteredPaginatedRowsSelected = computed(() =>
    this._filteredSortedPaginatedData().every((row) =>
      this._selected().includes(row)
    )
  );

  protected readonly _checkboxState = computed(() => {
    const noneSelected = this._selected().length === 0;
    const allSelectedOrIndeterminate = this._allFilteredPaginatedRowsSelected()
      ? true
      : 'indeterminate';
    return noneSelected ? false : allSelectedOrIndeterminate;
  });

  protected readonly _trackBy: TrackByFunction<any> = (_: number, row: any) => {
    const primaryKey = this.tableSchema()?.info.columns.find(
      (col) => col.is_primary_key
    )?.name;
    return primaryKey ? row[primaryKey] : row;
  };
  protected readonly _totalElements = computed(
    () => this._filteredData().length
  );
  protected readonly _onStateChange = ({
    startIndex,
    endIndex,
  }: PaginatorState) =>
    this._displayedIndices.set({ start: startIndex, end: endIndex });

  constructor() {
    this.loadTableSchema();

    effect(() => {
      const debouncedFilter = this._debouncedFilter();
      this._filter.set(debouncedFilter ?? '');
    });

    effect(() => {
      const schema = this.tableSchema();
      if (!schema) return;
      const columnConfig = schema.info.columns.reduce((acc, column) => {
        acc[column.name] = { visible: true, label: column.name };
        return acc;
      }, {} as Record<string, { visible: boolean; label: string }>);

      // setTimeout(() => {
      this._brnColumnManager.resetVisibility(columnConfig as any);
      // }, 10000);
    });
  }

  async loadTableSchema() {
    const data = await fetch(`http://localhost:8000/api/db/${this.tableName}`, {
      credentials: 'include',
    });
    const response = await fetch(
      `http://localhost:8000/api/db/schema/tables/${this.tableName}`,
      {
        credentials: 'include',
      }
    );
    const schema = await response.json();
    // console.log(schema);
    this._data.set(await data.json());
    this.tableSchema.set(schema);
  }

  protected toggleRow(row: any) {
    this._selectionModel.toggle(row);
  }

  protected handleHeaderCheckboxChange() {
    const previousCbState = this._checkboxState();
    if (previousCbState === 'indeterminate' || !previousCbState) {
      this._selectionModel.select(...this._filteredSortedPaginatedData());
    } else {
      this._selectionModel.deselect(...this._filteredSortedPaginatedData());
    }
  }

  protected handleSortChange(column: string) {
    const currentColumn = this._sortColumn();
    const currentDirection = this._sortDirection();

    if (currentColumn !== column) {
      this._sortColumn.set(column);
      this._sortDirection.set('ASC');
    } else {
      if (currentDirection === 'ASC') {
        this._sortDirection.set('DESC');
      } else if (currentDirection === 'DESC') {
        this._sortDirection.set(null);
        this._sortColumn.set(null);
      } else {
        this._sortDirection.set('ASC');
        this._sortColumn.set(column);
      }
    }
  }
}
