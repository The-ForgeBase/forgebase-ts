import { Component, inject, OnInit, signal } from '@angular/core';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import {
  HlmCardContentDirective,
  HlmCardDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
} from '@spartan-ng/ui-card-helm';
import { RouterLink } from '@angular/router';
import { DatabaseService } from '../../../services/database.service';

@Component({
  standalone: true,
  imports: [
    HlmButtonDirective,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardContentDirective,
    RouterLink,
  ],
  template: `
    <div class="p-6 space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div hlmCard>
          <div hlmCardHeader>
            <h3 hlmCardTitle>Database Tables</h3>
          </div>
          <div hlmCardContent>
            <p class="text-3xl font-bold">{{ tables().length }}</p>
            <p class="text-sm text-muted-foreground">
              Total tables in database
            </p>
          </div>
        </div>

        <div hlmCard>
          <div hlmCardHeader>
            <h3 hlmCardTitle>Quick Actions</h3>
          </div>
          <div hlmCardContent class="space-y-2">
            <button hlmBtn variant="outline" class="w-full justify-start">
              <span class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Table
              </span>
            </button>
            <button hlmBtn variant="outline" class="w-full justify-start">
              <span class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Import Data
              </span>
            </button>
          </div>
        </div>

        <div hlmCard>
          <div hlmCardHeader>
            <h3 hlmCardTitle>Recent Tables</h3>
          </div>
          <div hlmCardContent>
            <div class="space-y-2">
              @for (table of tables().slice(0, 5); track table) {
              <a
                [routerLink]="['/studio/database', table]"
                class="block hover:bg-accent hover:text-accent-foreground p-2 rounded-md"
              >
                {{ table }}
              </a>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export default class DatabaseIndexComponent implements OnInit {
  tables = signal<string[]>([]);

  databaseService = inject(DatabaseService);

  ngOnInit(): void {
    this.tables.set(this.databaseService.getTables()());
  }
}
