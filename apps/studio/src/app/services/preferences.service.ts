import { Injectable, Signal, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly SIDEBAR_PINNED_KEY = 'studio_sidebar_pinned';
  private platformId = inject(PLATFORM_ID);
  private sidebarPinnedState = signal<boolean>(false);

  constructor() {
    // Initialize from localStorage only in browser
    if (isPlatformBrowser(this.platformId)) {
      this.sidebarPinnedState.set(this.loadSidebarPinned());
    }
  }

  private loadSidebarPinned(): boolean {
    const stored = localStorage.getItem(this.SIDEBAR_PINNED_KEY);
    return stored ? JSON.parse(stored) : false;
  }

  getSidebarPinned(): Signal<boolean> {
    return this.sidebarPinnedState.asReadonly();
  }

  setSidebarPinned(isPinned: boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.SIDEBAR_PINNED_KEY, JSON.stringify(isPinned));
      this.sidebarPinnedState.set(isPinned);
    }
  }
}
