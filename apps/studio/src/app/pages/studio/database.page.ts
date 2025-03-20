import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad } from '@analogjs/router';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { BehaviorSubject } from 'rxjs';

import { load } from './database.server';

@Component({
  selector: 'studio-database-layout',
  standalone: true,
  host: {
    class: 'block w-full h-[calc(100svh-5rem)] overflow-hidden max-w-[100%]',
  },
  imports: [
    HlmScrollAreaDirective,
    NgScrollbarModule,
    RouterLink,
    RouterOutlet,
  ],
  providers: [DatabaseService],
  template: `
    <div
      class="grid h-screen w-full overflow-hidden max-w-[100%] grid-cols-1 md:grid-cols-[250px_1fr] gap-0"
    >
      <ng-scrollbar
        hlm
        class="border-border h-full border-r space-y-4 py-4 hidden md:block"
      >
        <div class="px-3 py-2">
          <h2 class="mb-4 px-4 text-lg font-semibold tracking-tight">Tables</h2>
          <div class="space-y-1">
            @for (table of data().tables; track table) {
            <a
              [routerLink]="['/studio/database', table]"
              class="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
            >
              {{ table }}
            </a>
            }
          </div>
        </div>
      </ng-scrollbar>
      <ng-scrollbar #tablelayout hlm class="h-full space-y-4 py-4 w-full">
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

  ngOnInit(): void {
    this.data().tables.forEach((table: string) => {
      this.database.addTable(table);
    });
  }

  ngAfterViewInit(): void {
    this.updateContainerWidth();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.updateContainerWidth());
      // add ResizeObserver api
      const observer = new ResizeObserver(() => this.updateContainerWidth());
      observer.observe(this.tableLayout.nativeElement);
    }
  }

  private updateContainerWidth(): void {
    if (this.tableLayout) {
      const width = this.tableLayout.nativeElement.offsetWidth;
      // console.log('width', width);
      this.containerWidth.next(width);
      this.database.setContainerWidth(width);
    }
  }
}
