import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
  standalone: true,
  imports: [RouterOutlet, ScrollPanelModule],
  template: `
    <div class="flex h-screen w-full overflow-hidden">Database Layout</div>
  `,
})
export default class DatabaseLayoutComponent {}
