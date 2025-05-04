import { Component, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';

@Component({
  selector: 'docs-layout',
  standalone: true,
  host: {
    class: 'block w-full h-svh overflow-hidden',
  },
  imports: [CommonModule, RouterModule, HlmScrollAreaDirective],
  template: `
    <div
      class="w-full h-[100%] flex flex-row"
      [class.search-open]="isSearchOpen()"
    >
      <ng-scrollbar
        hlm
        class="h-[100%] w-full max-w-[250px]"
        visibility="native"
      >
        <nav class="h-full px-4 py-6 w-full">
          <ng-content select="[slot=sidebar]"></ng-content>
        </nav>
      </ng-scrollbar>
      <div class="flex flex-col items-start justify-start h-full w-full">
        <header
          class="fixed top-0 z-10 bg-white w-full flex flex-row items-center justify-between"
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

        <ng-scrollbar hlm class="h-[100%] w-full" visibility="native">
          <main class="docs-main">
            <ng-content></ng-content>
          </main>

          <aside class="docs-toc">
            <ng-content select="[slot=toc]"></ng-content>
          </aside>
        </ng-scrollbar>
      </div>
    </div>
  `,
  styles: [
    `
      .docs-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .docs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        border-bottom: 1px solid var(--border-color);
        background: var(--header-bg);
      }

      .logo-section {
        display: flex;
        align-items: center;
        gap: 2rem;
      }

      .search-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--search-bg);
      }

      .search-box kbd {
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        background: var(--kbd-bg);
        font-size: 0.8rem;
      }

      .header-actions {
        display: flex;
        gap: 1rem;
      }

      .docs-content {
        display: grid;
        grid-template-columns: 250px 1fr 200px;
        gap: 2rem;
        flex: 1;
        padding: 2rem;
      }

      .docs-sidebar {
        border-right: 1px solid var(--border-color);
        padding-right: 1rem;
      }

      .docs-main {
        max-width: 800px;
        margin: 0 auto;
      }

      .docs-toc {
        border-left: 1px solid var(--border-color);
        padding-left: 1rem;
      }
    `,
  ],
  encapsulation: ViewEncapsulation.None,
})
export class DocsLayoutComponent {
  isSearchOpen = signal(false);

  toggleSearch() {
    this.isSearchOpen.update((v) => !v);
  }
}
