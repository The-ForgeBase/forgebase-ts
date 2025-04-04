import { Component } from '@angular/core';
import { TopStudioMenuComponent } from './studio/components/top-menu.component';
import { SideStudioMenuComponent } from './studio/components/side-menu/side-menu.component';

import { CommonModule } from '@angular/common';

import { RouterOutlet } from '@angular/router';
import { injectRouter, RouteMeta } from '@analogjs/router';
import { injectResponse } from '@analogjs/router/tokens';

export const routeMeta: RouteMeta = {
  title: 'Studio',
  canActivate: [
    () => {
      const response = injectResponse();
      console.log('ssr', import.meta.env.SSR);
      if (import.meta.env.SSR && response) {
        const status = response.statusCode;
        if (status === 401) {
          return false;
        }
      }
      return true;
    },
  ],
};

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
        <div class="w-full flex flex-col flex-1 max-w-[100%]">
          <router-outlet />
          <div
            class="sticky bottom-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 flex items-center justify-center"
          >
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
