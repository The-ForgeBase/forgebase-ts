import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreadcrumbsComponent } from '../breadcrumbs/breadcrumbs.component';
import { ContainerDirective } from './container.directive';
import { MainSectionDirective } from './main-section.directive';
import { PageNavOutletComponent } from './page-nav/page-nav-outlet.component';
import { SideNavComponent } from './side-nav/side-nav.component';

@Component({
  selector: 'spartan-page',
  imports: [
    RouterOutlet,
    SideNavComponent,
    BreadcrumbsComponent,
    MainSectionDirective,
    PageNavOutletComponent,
  ],
  hostDirectives: [ContainerDirective],
  template: `
    <spartan-side-nav />
    <main
      class="sticky top-0 overflow-hidden py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[minmax(0,1fr)_280px]"
    >
      <div class="px-2">
        <spartan-breadcrumbs />
        <router-outlet />
      </div>
      <spartan-page-nav-outlet />
    </main>
  `,
})
export class PageComponent {}
