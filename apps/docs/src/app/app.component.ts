import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/footer/footer.component';
import { HeaderComponent } from './shared/header/header.component';

@Component({
  selector: 'docs-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  host: {
    class: 'text-foreground block antialiased',
  },
  template: `
    <docs-header />
    <div class="mx-auto max-w-screen-2xl">
      <router-outlet />
    </div>
    <docs-footer />
  `,
})
export class AppComponent {}
