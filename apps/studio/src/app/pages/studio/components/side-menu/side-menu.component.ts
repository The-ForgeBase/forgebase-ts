import { NgClass, NgIf } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutGrid,
  lucideDatabase,
  lucideServer,
  lucideShield,
  lucideBox,
  lucideRocket,
  lucideGlobe,
  lucideZap,
  lucideCode,
  lucideSettings,
  lucideUsers,
  lucideKey,
  lucideBell,
  lucideActivity,
  lucideChartLine,
  lucideFileText,
  lucideLock,
  lucideShieldAlert,
  lucideHistory,
  lucideChevronRight,
  lucideChevronLeft,
} from '@ng-icons/lucide';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { SideMenuButtonComponent } from './side-menu-button.component';
import { PreferencesService } from '../../../../services/preferences.service';

interface ListItem {
  text: string;
  icon: string;
  selected?: boolean;
  link: string;
  disabled?: boolean;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'studio-side-menu',
  standalone: true,
  host: {
    class: 'block max-w-[250px]',
  },
  imports: [
    SideMenuButtonComponent,
    NgIcon,
    HlmIconDirective,
    HlmButtonDirective,
    HlmScrollAreaDirective,
    NgScrollbarModule,
    NgClass,
    NgIf,
  ],
  providers: [
    provideIcons({
      lucideLayoutGrid,
      lucideDatabase,
      lucideServer,
      lucideShield,
      lucideBox,
      lucideRocket,
      lucideGlobe,
      lucideZap,
      lucideCode,
      lucideSettings,
      lucideUsers,
      lucideKey,
      lucideBell,
      lucideActivity,
      lucideChartLine,
      lucideFileText,
      lucideLock,
      lucideShieldAlert,
      lucideHistory,
      lucideChevronRight,
      lucideChevronLeft,
    }),
  ],
  template: `
    <ng-scrollbar
      hlm
      class="border-border h-screen border-r space-y-4 py-4 relative transition-all duration-300 ease-in-out"
      [ngClass]="{
        'w-[230px]': isPinned() || hover(),
        'w-[60px]': !isPinned() && !hover(),
        'pb-10': isPinned() || hover()
      }"
      [visibility]="isPinned() ? 'native' : 'hover'"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <button
        hlmBtn
        variant="ghost"
        size="icon"
        class="absolute right-2 top-2 transition-opacity duration-200"
        [class.opacity-0]="!hover() && !isPinned()"
        [class.opacity-100]="hover() || isPinned()"
        (click)="togglePin()"
      >
        <ng-icon
          hlm
          [name]="isPinned() ? 'lucideChevronLeft' : 'lucideChevronRight'"
          size="sm"
        />
        <span class="sr-only">{{
          isPinned() ? 'Unpin Sidebar' : 'Pin Sidebar'
        }}</span>
      </button>

      <div class="px-3 py-2">
        <h2
          *ngIf="hover() || isPinned()"
          class="mb-2 px-4 text-lg font-semibold tracking-tight transition-opacity duration-200"
          [class.opacity-0]="!hover() && !isPinned()"
          [class.opacity-100]="hover() || isPinned()"
        >
          Overview
        </h2>
        <div class="space-y-1">
          @for (item of main; track item) {
          <studio-side-button class="font-medium" [link]="item.link">
            <ng-icon
              hlm
              size="sm"
              [name]="item.icon"
              class="h-4 w-4"
              [ngClass]="hover() || isPinned() ? 'mr-2' : ''"
            />
            <span w-full inline-block *ngIf="hover() || isPinned()">{{
              item.text
            }}</span>
          </studio-side-button>
          }
        </div>
      </div>

      <div class="px-3 py-2 w-full">
        <h2
          *ngIf="hover() || isPinned()"
          class="mb-2 px-4 text-lg font-semibold tracking-tight transition-opacity duration-200"
          [class.opacity-0]="!hover() && !isPinned()"
          [class.opacity-100]="hover() || isPinned()"
        >
          Features
        </h2>
        <div class="space-y-1">
          @for (item of features; track item) {
          <studio-side-button
            class="font-medium w-full flex"
            [link]="item.link"
          >
            <ng-icon
              hlm
              size="sm"
              [name]="item.icon"
              class="h-4 w-4"
              [ngClass]="hover() || isPinned() ? 'mr-2' : ''"
            />
            <span class="w-full inline-block" *ngIf="hover() || isPinned()">{{
              item.text
            }}</span>
          </studio-side-button>
          }
        </div>
      </div>

      <div class="px-3 py-2 w-full">
        <h2
          *ngIf="hover() || isPinned()"
          class="mb-2 px-4 text-lg font-semibold tracking-tight transition-opacity duration-200"
          [class.opacity-0]="!hover() && !isPinned()"
          [class.opacity-100]="hover() || isPinned()"
        >
          Monitoring
        </h2>
        <div class="space-y-1">
          @for (item of monitoring; track item) {
          <studio-side-button
            class="font-medium w-full flex"
            [link]="item.link"
          >
            <ng-icon
              hlm
              size="sm"
              [name]="item.icon"
              class="h-4 w-4"
              [ngClass]="hover() || isPinned() ? 'mr-2' : ''"
            />
            <span class="w-full inline-block" *ngIf="hover() || isPinned()">{{
              item.text
            }}</span>
          </studio-side-button>
          }
        </div>
      </div>

      <div class="px-3 py-2 w-full">
        <h2
          *ngIf="hover() || isPinned()"
          class="mb-2 px-4 text-lg font-semibold tracking-tight transition-opacity duration-200"
          [class.opacity-0]="!hover() && !isPinned()"
          [class.opacity-100]="hover() || isPinned()"
        >
          Security
        </h2>
        <div class="space-y-1">
          @for (item of security; track item) {
          <studio-side-button
            class="font-medium w-full flex"
            [link]="item.link"
          >
            <ng-icon
              hlm
              size="sm"
              [name]="item.icon"
              class="h-4 w-4"
              [ngClass]="hover() || isPinned() ? 'mr-2' : ''"
            />
            <span class="w-full inline-block" *ngIf="hover() || isPinned()">{{
              item.text
            }}</span>
          </studio-side-button>
          }
        </div>
      </div>

      <div class="px-3 py-2 w-full">
        <h2
          *ngIf="hover() || isPinned()"
          class="mb-2 px-4 text-lg font-semibold tracking-tight transition-opacity duration-200"
          [class.opacity-0]="!hover() && !isPinned()"
          [class.opacity-100]="hover() || isPinned()"
        >
          Tools
        </h2>
        <div class="space-y-1">
          @for (item of tools; track item) {
          <studio-side-button
            class="font-medium w-full flex"
            [link]="item.link"
          >
            <ng-icon
              hlm
              size="sm"
              [name]="item.icon"
              class="h-4 w-4"
              [ngClass]="hover() || isPinned() ? 'mr-2' : ''"
            />
            <span class="w-full inline-block" *ngIf="hover() || isPinned()">{{
              item.text
            }}</span>
          </studio-side-button>
          }
        </div>
      </div>
    </ng-scrollbar>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .transition-width {
        transition: width 300ms ease-in-out;
      }
    `,
  ],
})
export class SideStudioMenuComponent {
  public main: ListItem[] = [
    {
      text: 'Dashboard',
      icon: 'lucideLayoutGrid',
      selected: true,
      link: '/studio',
    },
    { text: 'Database', icon: 'lucideDatabase', link: '/studio/database' },
    { text: 'API', icon: 'lucideServer', link: '/studio/api' },
    { text: 'Auth', icon: 'lucideShield', link: '/studio/auth' },
    { text: 'Storage', icon: 'lucideBox', link: '/studio/storage' },
  ];

  public features: ListItem[] = [
    { text: 'Deployment', icon: 'lucideRocket', link: '/studio/deployment' },
    { text: 'Edge Functions', icon: 'lucideGlobe', link: '/studio/edge' },
    { text: 'Performance', icon: 'lucideZap', link: '/studio/performance' },
    { text: 'Integrations', icon: 'lucideCode', link: '/studio/integrations' },
  ];

  public monitoring: ListItem[] = [
    { text: 'Metrics', icon: 'lucideChartLine', link: '/studio/metrics' },
    { text: 'Logs', icon: 'lucideFileText', link: '/studio/logs' },
    { text: 'Alerts', icon: 'lucideBell', link: '/studio/alerts' },
    { text: 'Activity', icon: 'lucideActivity', link: '/studio/activity' },
    { text: 'Audit History', icon: 'lucideHistory', link: '/studio/audit' },
  ];

  public security: ListItem[] = [
    {
      text: 'Access Control',
      icon: 'lucideLock',
      link: '/studio/access-control',
    },
    {
      text: 'Security Rules',
      icon: 'lucideShieldAlert',
      link: '/studio/security-rules',
    },
    { text: 'API Keys', icon: 'lucideKey', link: '/studio/api-keys' },
  ];

  public tools: ListItem[] = [
    { text: 'Settings', icon: 'lucideSettings', link: '/studio/settings' },
    { text: 'Team', icon: 'lucideUsers', link: '/studio/team' },
  ];

  constructor(private preferencesService: PreferencesService) {
    // Initialize isPinned from preferences
    this.isPinned = computed(() =>
      this.preferencesService.getSidebarPinned()()
    );
  }

  private hoverTimeout: any;
  hover = signal(false);
  isOpen = signal(false);
  isPinned = computed(() => false); // Will be initialized in constructor

  onMouseEnter() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    if (!this.isPinned()) {
      this.hover.set(true);
    }
  }

  onMouseLeave() {
    if (!this.isPinned()) {
      this.hoverTimeout = setTimeout(() => {
        this.hover.set(false);
      }, 300); // Add a small delay before closing
    }
  }

  togglePin() {
    const newPinnedState = !this.isPinned();
    this.preferencesService.setSidebarPinned(newPinnedState);
    if (!newPinnedState) {
      // When unpinning, wait a bit before allowing hover state
      setTimeout(() => {
        if (!this.isPinned()) {
          this.hover.set(false);
        }
      }, 300);
    }
  }
}
