import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'studio-side-button',
  standalone: true,
  host: {
    class: 'block',
  },
  providers: [],
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a
      routerLinkActive="bg-secondary"
      [routerLinkActiveOptions]="{ exact: true }"
      [routerLink]="[link()]"
      class="hover:bg-secondary/80 focus-visible:ring-ring inline-flex h-9 w-full items-center justify-start rounded px-4 py-2 text-left text-sm transition-colors focus-visible:right-1 focus:focus-visible:outline-none"
    >
      <ng-content></ng-content>
    </a>
  `,
})
export class SideMenuButtonComponent {
  link = input<string>('/');
}
