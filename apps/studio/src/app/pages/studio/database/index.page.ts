import { Component } from '@angular/core';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectLoad } from '@analogjs/router';

import { load } from './index.server';

@Component({
  selector: 'studio-database-layout',
  standalone: true,
  host: {
    class: 'block w-full h-[calc(100svh-5rem)] overflow-hidden',
  },
  imports: [HlmScrollAreaDirective, NgScrollbarModule],
  template: `
    <div class="flex h-screen w-full overflow-hidden">
      <ng-scrollbar
        hlm
        class="border-border h-full border-r space-y-4 py-4 w-[250px]"
      >
        Loaded: {{ data().loaded }}
      </ng-scrollbar>
    </div>
  `,
})
export default class DatabaseLayoutComponent {
  data = toSignal(injectLoad<typeof load>(), { requireSync: true });
}
