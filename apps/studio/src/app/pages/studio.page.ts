import { Component } from '@angular/core';
import { TopStudioMenuComponent } from './studio/components/top-menu.component';
import { SideStudioMenuComponent } from './studio/components/side-menu/side-menu.component';

import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'spartan-music-example',
  standalone: true,
  host: {
    class: 'block max-h-screen',
  },
  imports: [
    SideStudioMenuComponent,
    TopStudioMenuComponent,

    NgScrollbarModule,

    CommonModule,
    RouterOutlet,
  ],
  template: `
    <div class="flex h-screen flex-col overflow-hidden bg-background">
      <studio-top-menu class="px-2 lg:px-4" />
      <div class="border-border bg-background border-t h-full">
        <div class="w-full flex h-full">
          <studio-side-menu />
          <ng-scrollbar hlm class="h-[100%] w-full pb-8" visibility="native">
            <router-outlet />
            <div class="w-full flex flex-col items-center justify-center mb-8">
              <p class="text-center text-sm text-foreground">
                Forgebase Studio
                <span class="text-foreground/50">Version 0.0.1</span>
              </p>
            </div>
          </ng-scrollbar>
        </div>
      </div>
    </div>
  `,
})
export default class StudioLayoutComponent {}
