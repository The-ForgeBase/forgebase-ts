import { Injectable, signal, computed } from '@angular/core';

/**
 * Service to manage sidebar navigation state across components
 *
 * @example
 * constructor(private sidebarService: SidebarService) {}
 *
 * // Get active section
 * const currentSection = this.sidebarService.activeSection();
 *
 * // Change active section
 * this.sidebarService.setActiveSection('dashboard');
 */
@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  // Active section signal
  activeSection = signal<string>('dashboard');

  // Navigation items for primary sidebar
  primaryNavItems = signal([
    { id: 'dashboard', label: 'Dashboard', icon: 'pi pi-home', items: [] },
    { id: 'apps', label: 'Applications', icon: 'pi pi-th-large', items: [] },
    { id: 'database', label: 'Database', icon: 'pi pi-database', items: [] },
    { id: 'storage', label: 'Storage', icon: 'pi pi-inbox', items: [] },
    { id: 'auth', label: 'Authentication', icon: 'pi pi-shield', items: [] },
    { id: 'functions', label: 'Functions', icon: 'pi pi-code', items: [] },
  ]);

  // Bottom navigation items
  bottomNavItems = signal([
    { id: 'settings', label: 'Settings', icon: 'pi pi-cog', items: [] },
    { id: 'profile', label: 'Profile', icon: 'pi pi-user', items: [] },
  ]);

  // Navigation data with sub-items
  navData = signal<any>({
    dashboard: {
      label: 'Dashboard',
      items: [
        { label: 'Overview', route: '/dashboard', icon: 'pi pi-chart-bar' },
        {
          label: 'Analytics',
          route: '/dashboard/analytics',
          icon: 'pi pi-chart-line',
        },
        {
          label: 'Monitoring',
          route: '/dashboard/monitoring',
          icon: 'pi pi-chart-pie',
        },
      ],
    },
    apps: {
      label: 'Applications',
      items: [
        { label: 'App List', route: '/apps', icon: 'pi pi-list' },
        { label: 'Create App', route: '/apps/create', icon: 'pi pi-plus' },
        { label: 'API Keys', route: '/apps/api-keys', icon: 'pi pi-key' },
      ],
    },
    database: {
      label: 'Database',
      items: [
        { label: 'Tables', route: '/database/tables', icon: 'pi pi-table' },
        {
          label: 'Query Editor',
          route: '/database/query',
          icon: 'pi pi-filter',
        },
        {
          label: 'Backups',
          route: '/database/backups',
          icon: 'pi pi-cloud-download',
        },
      ],
    },
    storage: {
      label: 'Storage',
      items: [
        { label: 'Files', route: '/storage/files', icon: 'pi pi-file' },
        { label: 'Buckets', route: '/storage/buckets', icon: 'pi pi-folder' },
        { label: 'Settings', route: '/storage/settings', icon: 'pi pi-cog' },
      ],
    },
    auth: {
      label: 'Authentication',
      items: [
        { label: 'Users', route: '/auth/users', icon: 'pi pi-users' },
        { label: 'Roles', route: '/auth/roles', icon: 'pi pi-id-card' },
        { label: 'Providers', route: '/auth/providers', icon: 'pi pi-google' },
      ],
    },
    functions: {
      label: 'Functions',
      items: [
        {
          label: 'Edge Functions',
          route: '/functions/edge',
          icon: 'pi pi-bolt',
        },
        {
          label: 'Schedules',
          route: '/functions/schedules',
          icon: 'pi pi-calendar',
        },
        { label: 'Logs', route: '/functions/logs', icon: 'pi pi-list' },
      ],
    },
    settings: {
      label: 'Settings',
      items: [
        { label: 'General', route: '/settings', icon: 'pi pi-sliders-h' },
        { label: 'Security', route: '/settings/security', icon: 'pi pi-lock' },
        {
          label: 'Billing',
          route: '/settings/billing',
          icon: 'pi pi-credit-card',
        },
        { label: 'Team', route: '/settings/team', icon: 'pi pi-users' },
      ],
    },
    profile: {
      label: 'Profile',
      items: [
        { label: 'Account', route: '/profile', icon: 'pi pi-user' },
        {
          label: 'Preferences',
          route: '/profile/preferences',
          icon: 'pi pi-cog',
        },
        { label: 'Logout', route: '/logout', icon: 'pi pi-sign-out' },
      ],
    },
  });

  // Computed value for active section data
  activeSectionData = computed(() => {
    return this.navData()[this.activeSection()] || null;
  });

  /**
   * Sets the active navigation section
   * @param sectionId - The ID of the section to activate
   */
  setActiveSection(sectionId: string): void {
    this.activeSection.set(sectionId);
  }

  /**
   * Gets the route for the first item in a section
   * @param sectionId - The section ID to get the default route from
   * @returns The route string or undefined if section or items don't exist
   */
  getDefaultRouteForSection(sectionId: string): string | undefined {
    const section = this.navData()[sectionId];
    if (section?.items?.length) {
      return section.items[0].route;
    }
    return undefined;
  }

  /**
   * Finds the section ID for a given route path
   * @param routePath - The current route path
   * @returns The section ID or undefined if not found
   */
  findSectionForRoute(routePath: string): string | undefined {
    const sections = Object.keys(this.navData());

    for (const sectionId of sections) {
      const section = this.navData()[sectionId];
      const matchingItem = section.items.find((item: any) =>
        routePath.startsWith(item.route)
      );

      if (matchingItem) {
        return sectionId;
      }
    }

    return undefined;
  }
}
