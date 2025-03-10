import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
  standalone: true,
  imports: [RouterOutlet, ScrollPanelModule],
  template: `
    <div class="flex h-screen w-full overflow-hidden">
      <!-- Main Content Area -->
      <p-scrollPanel [style]="{ width: '100%', height: '100vh' }">
        <div class="p-4">
          <router-outlet></router-outlet>
        </div>
      </p-scrollPanel>
    </div>
  `,
})
export default class AuthLayoutComponent {}
