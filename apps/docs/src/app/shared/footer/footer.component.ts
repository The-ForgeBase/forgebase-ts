import { Component } from '@angular/core';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { hlmMuted } from '@spartan-ng/ui-typography-helm';

@Component({
  selector: 'docs-footer',
  imports: [HlmButtonDirective],
  host: {
    class: 'block border-t bg-background/95 bg-blur-lg border-border px-4 py-8',
  },
  template: `
    <footer class="${hlmMuted} mx-auto max-w-screen-xl text-sm">
      Built by
      <a
        class="h-6 px-0.5 text-sm"
        hlmBtn
        href="https://github.com/SOG-web"
        target="_blank"
        variant="link"
      >
        SOG-web
      </a>
      Open source and available on
      <a
        class="h-6 px-0.5 text-sm"
        hlmBtn
        href="https://github.com/The-ForgeBase"
        target="_blank"
        variant="link"
      >
        GitHub.
      </a>
    </footer>
  `,
})
export class FooterComponent {}
