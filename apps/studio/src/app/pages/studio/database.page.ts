import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  computed,
  viewChild,
} from '@angular/core';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import {
  BrnSheetComponent,
  BrnSheetContentDirective,
  BrnSheetTriggerDirective,
} from '@spartan-ng/brain/sheet';
import {
  HlmSheetComponent,
  HlmSheetContentComponent,
  HlmSheetDescriptionDirective,
  HlmSheetHeaderComponent,
  HlmSheetTitleDirective,
} from '@spartan-ng/ui-sheet-helm';
import { provideIcons } from '@ng-icons/core';
import { lucideCross } from '@ng-icons/lucide';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad } from '@analogjs/router';
import {
  RouterLink,
  RouterOutlet,
  ActivatedRoute,
  Router,
} from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { animate, style, transition, trigger } from '@angular/animations';
import { NewTableComponent } from './components/table/new-table/new-table.component';

import { load } from './database.server';
import { TableItem } from '../../shared/types/database';

/**
 * DatabaseLayoutComponent provides the main layout for the database management interface.
 * It handles the sidebar navigation for tables and the main content area.
 *
 * @implements OnInit
 * @implements AfterViewInit
 */
@Component({
  selector: 'studio-database-layout',
  standalone: true,
  host: {
    class: 'block w-full h-svh pb-[5rem] overflow-hidden max-w-[100%]',
  },
  imports: [
    CommonModule,
    FormsModule,
    HlmScrollAreaDirective,
    NgScrollbarModule,
    RouterLink,
    RouterOutlet,
    TooltipModule,
    InputTextModule,
    BrnSheetTriggerDirective,
    BrnSheetContentDirective,
    HlmSheetComponent,
    HlmSheetContentComponent,
    HlmSheetHeaderComponent,
    HlmSheetTitleDirective,
    HlmSheetDescriptionDirective,
    NewTableComponent,
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '150ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '100ms ease-in',
          style({ opacity: 0, transform: 'translateY(-10px)' })
        ),
      ]),
    ]),
  ],
  providers: [DatabaseService, provideIcons({ lucideCross })],
  template: `
    <div
      class="grid h-screen w-full overflow-hidden max-w-[100%] grid-cols-1 md:grid-cols-[280px_1fr] gap-0"
    >
      <ng-scrollbar
        hlm
        class="border-border h-[calc(100svh-5rem)] border-r hidden md:block bg-muted/5"
      >
        <div class="py-4 px-3 flex flex-col h-full">
          <!-- Header with search -->
          <div class="mb-2 px-2 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold tracking-tight">
                Database Tables
              </h2>
              <hlm-sheet class="bg-white" #createTableSheetRef side="right">
                <button
                  class="rounded-full h-7 w-7 flex items-center justify-center hover:bg-muted transition-colors"
                  [pTooltip]="'Create new table'"
                  tooltipPosition="bottom"
                  brnSheetTrigger
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                <hlm-sheet-content
                  class="h-full bg-background w-[100%] !max-w-[900px]"
                  *brnSheetContent="let ctx"
                >
                  <hlm-sheet-header>
                    <h3 hlmSheetTitle>Create a new Table</h3>
                    <p hlmSheetDescription>Fill in the details below:</p>
                  </hlm-sheet-header>
                  <div class="py-4 grid gap-4 overflow-hidden w-full">
                    <ng-scrollbar hlm class="h-[calc(100svh-5rem)]">
                      <studio-new-table
                        (close)="closeSheet()"
                        [showSystemTables]="showSystemTables()"
                        [tables]="tables()"
                      ></studio-new-table>
                    </ng-scrollbar>
                  </div>
                </hlm-sheet-content>
              </hlm-sheet>
            </div>

            <div class="relative">
              <span
                class="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search tables..."
                [(ngModel)]="searchQuery"
                class="w-full py-1.5 pl-9 pr-3 text-sm rounded-md bg-background border border-input ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <!-- Tables Count Badge -->
          <div class="px-2 mb-2">
            <div
              class="text-xs font-medium flex justify-between items-center px-2 py-1.5 text-muted-foreground"
            >
              <span>{{ tables().length }} tables in total</span>
              <button
                class="h-5 w-5 rounded-sm hover:bg-accent/50 flex items-center justify-center"
                (click)="toggleShowSystemTables()"
                [pTooltip]="
                  showSystemTables()
                    ? 'Hide system tables'
                    : 'Show system tables'
                "
                tooltipPosition="bottom"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  [class.opacity-40]="!showSystemTables()"
                >
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path
                    d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"
                  />
                  <path d="M10 13l-2 2l2 2" />
                  <path d="M14 13l2 2l-2 2" />
                </svg>
              </button>
            </div>
          </div>

          <!-- User Tables Section -->
          <div class="mb-2">
            <div
              class="text-xs font-medium uppercase tracking-wider px-4 py-1.5 text-muted-foreground flex items-center"
            >
              <span>User Tables</span>
              <span
                class="ml-2 inline-flex items-center rounded-md bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10"
              >
                {{ filteredUserTables().length }}
              </span>
            </div>
            <div class="space-y-px">
              @for (table of filteredUserTables(); track table.name) {
              <a
                [routerLink]="['/studio/database', table.name]"
                class="flex items-center px-4 py-2 text-sm rounded-md transition-colors"
                [class.bg-accent]="currentTable() === table.name"
                [class.text-accent-foreground]="currentTable() === table.name"
                [class.text-foreground]="currentTable() !== table.name"
                [ngClass]="{
                  'hover:bg-accent/50': currentTable() !== table.name
                }"
              >
                <span class="mr-2 opacity-70">
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
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  </svg>
                </span>
                <span class="truncate font-medium">{{ table.name }}</span>
              </a>
              } @if (filteredUserTables().length === 0) {
              <div class="px-4 py-3 text-sm text-muted-foreground italic">
                No user tables found
              </div>
              }
            </div>
          </div>

          <!-- System Tables Section -->
          @if (showSystemTables()) {
          <div @fadeInOut>
            <div
              class="text-xs font-medium uppercase tracking-wider px-4 py-1.5 text-muted-foreground flex items-center"
            >
              <span>System Tables</span>
              <span
                class="ml-2 inline-flex items-center rounded-md bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10"
              >
                {{ filteredSystemTables().length }}
              </span>
            </div>
            <div class="space-y-px">
              @for (table of filteredSystemTables(); track table.name) {
              <a
                [routerLink]="['/studio/database', table.name]"
                class="flex items-center px-4 py-2 text-sm rounded-md transition-colors"
                [class.bg-accent]="currentTable() === table.name"
                [class.text-accent-foreground]="currentTable() === table.name"
                [class.text-foreground]="currentTable() !== table.name"
                [ngClass]="{
                  'hover:bg-accent/50': currentTable() !== table.name
                }"
                [pTooltip]="'System table'"
                tooltipPosition="right"
              >
                <span class="mr-2 opacity-70">
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
                  >
                    <path
                      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                    ></path>
                    <polyline points="3.29 7 12 12 20.71 7"></polyline>
                    <line x1="12" y1="22" x2="12" y2="12"></line>
                  </svg>
                </span>
                <span class="truncate opacity-80">{{ table.name }}</span>
              </a>
              }
            </div>
          </div>
          }

          <!-- Spacer and bottom section -->
          <div class="flex-grow"></div>
          <div class="pt-3 mt-3 border-t border-muted">
            <a
              [routerLink]="['/studio/database/settings']"
              href="javascript:void(0)"
              class="flex items-center px-4 py-2 text-sm rounded-md transition-colors hover:bg-accent/50"
              [pTooltip]="'View database settings'"
              tooltipPosition="top"
            >
              <span class="mr-2 opacity-70">
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
                >
                  <path
                    d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                  ></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </span>
              <span class="font-medium">Database Settings</span>
            </a>
          </div>
        </div>
      </ng-scrollbar>
      <ng-scrollbar
        #tablelayout
        hlm
        class="h-[calc(100svh-5rem)] space-y-4 py-4 w-full"
        [orientation]="'vertical'"
      >
        <router-outlet />
      </ng-scrollbar>
    </div>
  `,
})
export default class DatabaseLayoutComponent implements OnInit, AfterViewInit {
  @ViewChild('tablelayout') tableLayout!: ElementRef;
  private containerWidth = new BehaviorSubject<number>(0);
  data = toSignal(injectLoad<typeof load>(), { requireSync: true });
  database = inject(DatabaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public viewchildSheetRef = viewChild<BrnSheetComponent>(
    'createTableSheetRef'
  );

  /** Tracks the search query for filtering tables */
  searchQuery = signal('');

  /** Controls whether system tables are shown */
  showSystemTables = signal(false);

  /** Track the currently active table */
  currentTable = signal<string>('');

  /** All tables with metadata */
  tables = computed(() => {
    return this.database
      .getTables()()
      .map((name: string) => {
        // Identify system tables (starting with underscore or pg_ prefix)
        const isSystem =
          name.startsWith('_') ||
          name.startsWith('pg_') ||
          [
            'table_permissions',
            'internal_admin_audit_logs',
            'internal_admin_sessions',
            'internal_admins',
            'auth_config',
          ].includes(name);

        return {
          name,
          type: isSystem ? 'system' : 'user',
          icon: isSystem ? 'system' : 'table',
        } as TableItem;
      });
  });

  /** Filtered tables based on search query and system table preference */
  filteredTables = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    return this.tables().filter((table: any) => {
      const matchesSearch = table.name.toLowerCase().includes(query);
      const includeSystemTable =
        this.showSystemTables() || table.type !== 'system';
      return matchesSearch && includeSystemTable;
    });
  });

  /** User tables, filtered by search query */
  filteredUserTables = computed(() => {
    return this.filteredTables().filter((table: any) => table.type === 'user');
  });

  /** System tables, filtered by search query */
  filteredSystemTables = computed(() => {
    return this.filteredTables().filter(
      (table: any) => table.type === 'system'
    );
  });

  /**
   * Toggle display of system tables
   */
  toggleShowSystemTables(): void {
    this.showSystemTables.update((current) => !current);
  }

  /**
   * Initializes the component and sets up data
   */
  ngOnInit(): void {
    // Add tables to the database service
    this.database.setTables(this.data().tables);
    // Extract and set current table from URL
    this.updateCurrentTableFromUrl();
  }

  /**
   * Updates the current table selection based on the URL
   */
  private updateCurrentTableFromUrl(): void {
    // Subscribe to route changes to update the current table
    this.router.events.subscribe(() => {
      const urlSegments = this.router.url.split('/');
      const tableFromUrl = urlSegments[urlSegments.length - 1];
      if (tableFromUrl && this.data().tables.includes(tableFromUrl)) {
        this.currentTable.set(tableFromUrl);
      }
    });
  }

  /**
   * Sets up resize handlers after view has been initialized
   */
  ngAfterViewInit(): void {
    this.updateContainerWidth();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.updateContainerWidth());
      // add ResizeObserver api
      const observer = new ResizeObserver(() => this.updateContainerWidth());
      observer.observe(this.tableLayout.nativeElement);
    }
  }

  /**
   * Updates the container width in the database service
   * @private
   */
  private updateContainerWidth(): void {
    if (this.tableLayout) {
      const width = this.tableLayout.nativeElement.offsetWidth;
      this.containerWidth.next(width);
      this.database.setContainerWidth(width);
    }
  }

  closeSheet() {
    this.viewchildSheetRef()?.close({});
  }
}
