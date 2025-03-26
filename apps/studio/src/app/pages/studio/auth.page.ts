import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
  standalone: true,
  imports: [RouterOutlet, ScrollPanelModule],
  host: {
    class: 'block w-full h-svh pb-[5rem] overflow-hidden max-w-[100%]',
  },
  template: `
    <div class="flex h-screen w-full overflow-hidden">
      Auth Layout
      <router-outlet></router-outlet>
    </div>
  `,
})
export default class AuthLayoutComponent {}
