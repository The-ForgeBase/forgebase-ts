import { Component, inject, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterModule,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { SidebarService } from '../../services/sidebar.service';
import { ScrollPanelModule } from 'primeng/scrollpanel';

/**
 * Multi-column sidebar component for navigation
 * Uses SidebarService for state management across components
 *
 * @example
 * <app-sidebar></app-sidebar>
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    RouterLinkActive,
    MenuModule,
    SidebarModule,
    ButtonModule,
    RippleModule,
    DividerModule,
    TooltipModule,
    ScrollPanelModule,
  ],
  template: `
    <div class="flex h-screen">
      <!-- Primary Sidebar Column -->
      <p-scrollPanel
        class="bg-surface-50"
        [style]="{ width: '70px', height: '100%' }"
      >
        <div
          class="w-[70px] h-full bg-surface-50 border-right border-surface-200 flex flex-col items-center py-4 shadow-sm"
        >
          <div class="flex flex-col gap-4 w-full">
            <div
              *ngFor="let primaryItem of sidebarService.primaryNavItems()"
              class="flex justify-center"
            >
              <button
                pButton
                [class.bg-primary-100]="
                  sidebarService.activeSection() === primaryItem.id
                "
                [class.text-primary-700]="
                  sidebarService.activeSection() === primaryItem.id
                "
                [class.bg-transparent]="
                  sidebarService.activeSection() !== primaryItem.id
                "
                [pTooltip]="primaryItem.label"
                tooltipPosition="right"
                class="p-button-text p-button-rounded p-3"
                (click)="selectSection(primaryItem.id)"
              >
                <i [class]="primaryItem.icon" class="text-xl"></i>
              </button>
            </div>
          </div>

          <div class="mt-auto flex flex-col gap-4 w-full">
            <div
              *ngFor="let bottomItem of sidebarService.bottomNavItems()"
              class="flex justify-center"
            >
              <button
                pButton
                [class.bg-primary-100]="
                  sidebarService.activeSection() === bottomItem.id
                "
                [class.text-primary-700]="
                  sidebarService.activeSection() === bottomItem.id
                "
                [class.bg-transparent]="
                  sidebarService.activeSection() !== bottomItem.id
                "
                [pTooltip]="bottomItem.label"
                tooltipPosition="right"
                class="p-button-text p-button-rounded p-3"
                (click)="selectSection(bottomItem.id)"
              >
                <i [class]="bottomItem.icon" class="text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </p-scrollPanel>

      <!-- Secondary Sidebar Column -->
      <p-scrollPanel
        class="bg-surface-0"
        [style]="{ width: '250px', height: '100%' }"
      >
        <div
          *ngIf="sidebarService.activeSectionData()"
          class="w-[250px] h-full bg-surface-0 border-r border-surface-200 flex flex-col py-4 shadow-1"
        >
          <div class="px-3 mb-3">
            <h3 class="text-lg font-medium m-0 p-0">
              {{ sidebarService.activeSectionData()?.label }}
            </h3>
          </div>

          <div class="flex flex-col gap-1 px-2">
            <div *ngFor="let item of sidebarService.activeSectionData()?.items">
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-primary-50 text-primary-700"
                class="flex items-center gap-2 px-3 py-2 no-underline text-secondary rounded-md hover:bg-surface-100 transition-colors transition-duration-150"
              >
                <i *ngIf="item.icon" [class]="item.icon" class="text-base"></i>
                <span>{{ item.label }}</span>
              </a>
            </div>
          </div>
        </div>
      </p-scrollPanel>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  protected sidebarService = inject(SidebarService);

  constructor() {
    // Use effect to sync current route with appropriate section on navigation
    effect(() => {
      const currentPath = this.router.url;
      const sectionId = this.sidebarService.findSectionForRoute(currentPath);

      if (sectionId && sectionId !== this.sidebarService.activeSection()) {
        this.sidebarService.setActiveSection(sectionId);
      }
    });
  }

  ngOnInit(): void {
    // Initialize active section based on current route
    const currentPath = this.router.url;
    const sectionId = this.sidebarService.findSectionForRoute(currentPath);

    if (sectionId) {
      this.sidebarService.setActiveSection(sectionId);
    }
  }

  /**
   * Select a navigation section and navigate to its first route
   * @param sectionId - ID of the section to select
   */
  selectSection(sectionId: string): void {
    this.sidebarService.setActiveSection(sectionId);

    // Navigate to the first route in the section
    const routePath = this.sidebarService.getDefaultRouteForSection(sectionId);
    if (routePath) {
      this.router.navigate([routePath]);
    }
  }
}
