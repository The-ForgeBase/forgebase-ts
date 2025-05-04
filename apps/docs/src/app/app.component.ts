import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'docs-root',
  imports: [RouterOutlet],
  host: {
    class: 'text-foreground block antialiased',
  },
  template: `
    <div class="mx-auto">
      <router-outlet />
    </div>
  `,
})
export class AppComponent {}
