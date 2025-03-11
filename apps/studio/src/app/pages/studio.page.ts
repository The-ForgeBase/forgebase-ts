import { Component } from '@angular/core';
import { TopStudioMenuComponent } from './studio/components/top-menu.component';
import { SideStudioMenuComponent } from './studio/components/side-menu/side-menu.component';

import { CommonModule } from '@angular/common';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'studio-layout',
  standalone: true,
  imports: [
    SideStudioMenuComponent,
    TopStudioMenuComponent,

    CommonModule,
    RouterOutlet,
  ],
  template: `
    <div
      class="flex max-h-screen min-h-svh flex-col overflow-hidden bg-background"
    >
      <studio-top-menu class="px-2 lg:px-4" />
      <div class="border-border bg-background border-t w-full flex flex-1">
        <studio-side-menu />
        <div class="w-full flex flex-col flex-1">
          <router-outlet />
          <div class="w-full h-[5rem] flex-1 flex items-center justify-center">
            <p class="text-center text-sm text-foreground">
              Forgebase Studio
              <span class="text-foreground/50">Version 0.0.1</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export default class StudioLayoutComponent {}
