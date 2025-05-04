import { Component, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'docs-layout',
  standalone: true,
  host: {
    class: 'block w-full h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    RouterModule,
    HlmScrollAreaDirective,
    NgScrollbarModule,
  ],
  template: `
    <div
      class="w-full h-full flex flex-row border border-red-500"
      [class.search-open]="isSearchOpen()"
    >
      <ng-scrollbar
        hlm
        class="h-[calc(100svh - 4rem)] w-full !max-w-[250px] border border-red-500"
        visibility="native"
      >
        <nav class="h-full px-4 py-6">
          <ng-content select="[slot=sidebar]"></ng-content>
        </nav>
      </ng-scrollbar>
      <div
        class="flex flex-col items-start justify-start h-full w-full border border-blue-500"
      >
        <header
          class=" bg-white w-full flex flex-row items-center justify-between"
        >
          <div class="logo-section">
            <a href="/" class="logo">
              <h1>Logo</h1>
            </a>
            <div class="search-box">
              <input
                type="text"
                placeholder="Search or ask..."
                (focus)="toggleSearch()"
              />
              <kbd>⌘K</kbd>
            </div>
          </div>
          <div class="header-actions">
            <button class="community-btn">Community</button>
            <button class="login-btn">Login</button>
            <button class="sign-up-btn">Sign up</button>
          </div>
        </header>
        <div class="flex flex-row w-full">
          <ng-scrollbar
            hlm
            class="h-[calc(100svh-4rem)] px-6 py-6 w-[calc(100%-250px)] border border-green-500 overflow-hidden"
            visibility="native"
          >
            <ng-content></ng-content>
          </ng-scrollbar>
          <ng-scrollbar
            hlm
            class="h-[calc(100svh-4rem)] px-6 py-6 w-[250px] border border-yellow-500 overflow-hidden"
            visibility="native"
          >
            <ng-content select="[slot=toc]"></ng-content>
          </ng-scrollbar>
        </div>
      </div>
    </div>
  `,
})
export class DocsLayoutComponent {
  isSearchOpen = signal(false);

  toggleSearch() {
    this.isSearchOpen.update((v) => !v);
  }
}
