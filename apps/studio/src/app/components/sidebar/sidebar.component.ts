import {
  Component,
  inject,
  effect,
  OnInit,
  computed,
  signal,
} from '@angular/core';
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
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { BadgeModule } from 'primeng/badge';
import { SidebarService } from '../../services/sidebar.service';

/**
 * Modern multi-column sidebar component for navigation with dark mode support
 * Uses SidebarService for state management across components
 *
 * Features:
 * - Dark mode compatible using CSS variables
 * - Responsive design that adapts to different screen sizes
 * - Smooth transitions and animations
 * - Accessibility features
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
    BadgeModule,
  ],
  template: `
    <div class="sidebar-container h-screen flex">
      <!-- Primary Sidebar Column -->
      <div class="primary-sidebar">
        <div class="logo-container flex justify-center py-3">
          <!-- App logo or branding here -->
          <div
            class="logo-placeholder flex items-center justify-center text-2xl"
          >
            <i class="pi pi-bolt"></i>
          </div>
        </div>

        <div class="flex flex-col gap-2 w-full px-1 py-2">
          <div
            *ngFor="let primaryItem of sidebarService.primaryNavItems()"
            class="nav-item-container flex justify-center"
          >
            <button
              pButton
              [pTooltip]="primaryItem.label"
              tooltipPosition="right"
              [class]="getNavItemClasses(primaryItem.id)"
              (click)="selectSection(primaryItem.id)"
              [attr.aria-label]="primaryItem.label"
            >
              <i [class]="primaryItem.icon"></i>
            </button>
          </div>
        </div>

        <div class="mt-auto flex flex-col gap-2 w-full px-1 py-2">
          <div
            *ngFor="let bottomItem of sidebarService.bottomNavItems()"
            class="nav-item-container flex justify-center"
          >
            <button
              pButton
              [pTooltip]="bottomItem.label"
              tooltipPosition="right"
              [class]="getNavItemClasses(bottomItem.id)"
              (click)="selectSection(bottomItem.id)"
              [attr.aria-label]="bottomItem.label"
            >
              <i [class]="bottomItem.icon"></i>
              <span
                *ngIf="hasNotifications(bottomItem.id)"
                pBadge
                value="!"
              ></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Secondary Sidebar Column -->
      <div *ngIf="sidebarService.activeSectionData()" class="secondary-sidebar">
        <div class="section-header px-3 py-3">
          <h3 class="section-title">
            <i *ngIf="sectionIcon()" [class]="sectionIcon() + ' mr-2'"></i>
            {{ sidebarService.activeSectionData()?.label }}
          </h3>
        </div>

        <div class="menu-items">
          <div *ngFor="let item of sidebarService.activeSectionData()?.items">
            <a
              [routerLink]="item.route"
              routerLinkActive="menu-item-active"
              class="menu-item"
              [attr.aria-label]="item.label"
            >
              <i *ngIf="item.icon" [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .sidebar-container {
        --sidebar-bg-primary: var(--surface-card, #ffffff);
        --sidebar-bg-secondary: var(--surface-section, #f8f9fa);
        --sidebar-border-color: var(--surface-border, #dee2e6);
        --sidebar-active-bg: var(--primary-50, #f5f9ff);
        --sidebar-active-color: var(--primary-600, #3b82f6);
        --sidebar-hover-bg: var(--surface-hover, #e9ecef);
        --sidebar-text: var(--text-color, #495057);
        --sidebar-icon-size: 1.25rem;
        --transition-speed: 0.2s;
      }

      /* Dark mode support using CSS variables */
      :host-context(.dark-theme) .sidebar-container {
        --sidebar-bg-primary: var(--surface-900, #212529);
        --sidebar-bg-secondary: var(--surface-800, #343a40);
        --sidebar-border-color: var(--surface-700, #495057);
        --sidebar-active-bg: var(--primary-900, #1e3a8a);
        --sidebar-active-color: var(--primary-200, #93c5fd);
        --sidebar-hover-bg: var(--surface-700, #495057);
        --sidebar-text: var (--text-color, #e9ecef);
      }

      .primary-sidebar {
        width: 4rem;
        height: 100%;
        background-color: var(--sidebar-bg-primary);
        border-right: 1px solid var(--sidebar-border-color);
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
        transition: width var(--transition-speed) ease;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
        z-index: 2;
      }

      .secondary-sidebar {
        width: 240px;
        height: 100%;
        background-color: var(--sidebar-bg-secondary);
        border-right: 1px solid var(--sidebar-border-color);
        display: flex;
        flex-direction: column;
        transition: width var(--transition-speed) ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .logo-container {
        height: 3.5rem;
        width: 100%;
        border-bottom: 1px solid var(--sidebar-border-color);
      }

      .logo-placeholder {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.5rem;
        color: var(--primary-color);
        background-color: var(--primary-50);
      }

      :host-context(.dark-theme) .logo-placeholder {
        background-color: var(--primary-900);
        color: var(--primary-200);
      }

      .section-header {
        border-bottom: 1px solid var(--sidebar-border-color);
      }

      .section-title {
        font-size: 1rem;
        font-weight: 500;
        margin: 0;
        color: var(--sidebar-text);
        display: flex;
        align-items: center;
      }

      .menu-items {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.5rem;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        color: var(--sidebar-text);
        border-radius: 0.375rem;
        text-decoration: none;
        font-size: 0.875rem;
        transition: all var(--transition-speed) ease;
      }

      .menu-item:hover {
        background-color: var(--sidebar-hover-bg);
      }

      .menu-item i {
        font-size: var(--sidebar-icon-size);
      }

      .menu-item-active {
        background-color: var(--sidebar-active-bg);
        color: var(--sidebar-active-color);
        font-weight: 500;
      }

      .nav-item-button {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.375rem;
        color: var(--sidebar-text);
        background-color: transparent;
        border: none;
        transition: all var(--transition-speed) ease;
        position: relative;
      }

      .nav-item-button i {
        font-size: var(--sidebar-icon-size);
      }

      .nav-item-button:hover {
        background-color: var(--sidebar-hover-bg);
      }

      .nav-item-active {
        background-color: var(--sidebar-active-bg) !important;
        color: var(--sidebar-active-color) !important;
      }

      /* Responsive styles */
      @media (max-width: 768px) {
        .secondary-sidebar {
          width: 200px;
        }
      }

      @media (max-width: 576px) {
        .primary-sidebar {
          width: 3.5rem;
        }
      }
    `,
  ],
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  protected sidebarService = inject(SidebarService);

  /**
   * Computed property to get the icon of the current active section
   */
  protected sectionIcon = computed(() => {
    const activeId = this.sidebarService.activeSection();
    const primaryItem = this.sidebarService
      .primaryNavItems()
      .find((item) => item.id === activeId);
    const bottomItem = this.sidebarService
      .bottomNavItems()
      .find((item) => item.id === activeId);
    return primaryItem?.icon || bottomItem?.icon || '';
  });

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
   * Get CSS classes for navigation item based on its active state
   * @param itemId - ID of the navigation item
   * @returns string of CSS classes
   */
  getNavItemClasses(itemId: string): string {
    const isActive = this.sidebarService.activeSection() === itemId;
    return `nav-item-button p-button-text p-button-rounded ${
      isActive ? 'nav-item-active' : ''
    }`;
  }

  /**
   * Check if a navigation item has notifications
   * @param itemId - ID of the navigation item
   * @returns boolean indicating if there are notifications
   */
  hasNotifications(itemId: string): boolean {
    // Example implementation - replace with actual notification logic
    return itemId === 'notifications';
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
