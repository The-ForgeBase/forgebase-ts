import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DocsLayoutComponent } from '../../lib/layouts/docs-layout.component';
import { NavSidebarComponent } from '../../lib/components/nav-sidebar/nav-sidebar.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, DocsLayoutComponent, NavSidebarComponent],
  host: {
    class: 'block w-full h-svh overflow-hidden',
  },
  template: `
    <docs-layout>
      <nav-sidebar slot="sidebar"></nav-sidebar>
      <router-outlet></router-outlet>
      <div slot="toc">Table of Contents</div>
    </docs-layout>
  `,
  styles: [``],
})
export default class DocsPage {}
