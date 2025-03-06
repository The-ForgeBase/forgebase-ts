import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SidebarComponent } from '../components/sidebar/sidebar.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, ScrollPanelModule, SidebarComponent],
  template: `
    <div class="flex h-screen w-full overflow-hidden">
      <!-- Multi-column Sidebar -->
      <app-sidebar></app-sidebar>

      <!-- Main Content Area -->
      <p-scrollPanel [style]="{ width: '100%', height: '100vh' }">
        <div class="p-4">
          <router-outlet></router-outlet>
        </div>
      </p-scrollPanel>
    </div>
  `,
})
export default class StudioLayoutComponent {}
