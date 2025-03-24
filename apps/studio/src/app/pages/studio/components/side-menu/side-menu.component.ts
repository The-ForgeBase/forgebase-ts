import { NgClass, NgIf } from '@angular/common';
import { Component, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutGrid,
  lucideLibrary,
  lucideListMusic,
  lucideMicVocal,
  lucideMusic2,
  lucideRadio,
  lucideShield,
  lucideTable,
  lucideUser,
} from '@ng-icons/lucide';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { SideMenuButtonComponent } from './side-menu-button.component';

interface ListItem {
  text: string;
  icon: string;
  selected?: boolean;
  link: string;
  disabled?: boolean;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'studio-side-menu',
  standalone: true,
  host: {
    class: 'block max-w-[250px]',
  },
  imports: [
    SideMenuButtonComponent,
    NgIcon,
    HlmIconDirective,
    HlmScrollAreaDirective,
    NgScrollbarModule,
    NgClass,
    NgIf,
  ],
  providers: [
    provideIcons({
      lucideShield,
      lucideLayoutGrid,
      lucideTable,
      lucideRadio,
      lucideListMusic,
      lucideMusic2,
      lucideUser,
      lucideMicVocal,
      lucideLibrary,
    }),
  ],
  template: `
    <ng-scrollbar
      hlm
      class="border-border h-full border-r space-y-4 py-4 w-full"
      [ngClass]="{
		'w-[230px]': hover(),
	  }"
      visibility="hover"
      (mouseenter)="toggleHover()"
      (mouseleave)="toggleHover()"
    >
      <div class="px-3 py-2">
        <h2
          *ngIf="hover()"
          class="mb-2 px-4 text-lg font-semibold tracking-tight"
        >
          Main
        </h2>
        <div class="space-y-1">
          @for (item of main; track item) {
          <studio-side-button class="font-medium" [link]="item.link">
            <ng-icon
              hlm
              size="sm"
              [name]="item.icon"
              class="h-4 w-4"
              [ngClass]="hover() ? 'mr-2' : ''"
            />
            <span w-full inline-block *ngIf="hover()">{{ item.text }}</span>
          </studio-side-button>
          }
        </div>
      </div>

      <div class="px-3 py-2 w-full">
        <h2
          *ngIf="hover()"
          class="mb-2 px-4 text-lg font-semibold tracking-tight"
        >
          Library
        </h2>
        <div class="space-y-1 w-full">
          @for (item of library; track item) {
          <studio-side-button class="font-medium w-full flex">
            <ng-icon
              hlm
              size="sm"
              [name]="item.icon"
              class="h-4 w-4"
              [ngClass]="hover() ? 'mr-2' : ''"
            />
            <span class="w-full inline-block" *ngIf="hover()">{{
              item.text
            }}</span>
          </studio-side-button>
          }
        </div>
      </div>

      <!-- <div class="py-2">
          <h2 class="mb-2 px-7 text-lg font-semibold tracking-tight">
            Playlists
          </h2>
          <div class="space-y-1">
            <ng-scrollbar hlm class="h-[300px]" visibility="hover">
              @for (item of playlists; track item) {
              <studio-side-button class="px-4">
                <ng-icon
                  hlm
                  size="sm"
                  [name]="item.icon"
                  class="mr-2 h-4 w-4"
                />
                {{ item.text }}
              </studio-side-button>
              }
            </ng-scrollbar>
          </div>
        </div> -->
    </ng-scrollbar>
  `,
})
export class SideStudioMenuComponent {
  public playlists: any[] = [
    { text: 'Recently Added', icon: 'lucideListMusic' },
    { text: 'Recently Played', icon: 'lucideListMusic' },
    { text: 'Top Songs', icon: 'lucideListMusic' },
    { text: 'Top Albums', icon: 'lucideListMusic' },
    { text: 'Top Artists', icon: 'lucideListMusic' },
    { text: 'Logic Discography', icon: 'lucideListMusic' },
    { text: 'Bedtime Beats', icon: 'lucideListMusic' },
    { text: 'Feeling Happy', icon: 'lucideListMusic' },
    { text: 'I Miss Y2K Pop', icon: 'lucideListMusic' },
    { text: 'Runtober', icon: 'lucideListMusic' },
    { text: 'Mellow Days', icon: 'lucideListMusic' },
    { text: 'Eminem Essentials', icon: 'lucideListMusic' },
  ];

  public library: any[] = [
    { text: 'Playlists', icon: 'lucideListMusic' },
    { text: 'Songs', icon: 'lucideMusic2' },
    { text: 'Made for You', icon: 'lucideUser' },
    { text: 'Artists', icon: 'lucideMicVocal' },
    { text: 'Albums', icon: 'lucideLibrary' },
  ];

  public main: ListItem[] = [
    {
      text: 'Overview',
      icon: 'lucideLayoutGrid',
      selected: true,
      link: '/studio',
    },
    { text: 'Auth', icon: 'lucideShield', link: '/studio/auth' },
    { text: 'Database', icon: 'lucideTable', link: '/studio/database' },
  ];

  hover = signal(false);
  isOpen = signal(false);

  toggleHover() {
    this.hover.set(!this.hover());
  }

  toggleOpen() {
    this.isOpen.set(!this.isOpen());
  }
}
