import type { RouteMeta } from '@analogjs/router';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideBolt,
  lucideCircleCheck,
  lucideDatabase,
  lucideLayers,
  lucidePuzzle,
  lucideServer,
  lucideShield,
  lucideStar,
  lucideWand,
} from '@ng-icons/lucide';
import {
  diGoOriginalWordmark,
  diPhpOriginal,
  diPythonOriginal,
  diRustOriginal,
  diTypescriptOriginal,
} from '@ng-icons/devicon/original';
import { HlmBadgeDirective } from '@spartan-ng/ui-badge-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmCardImports } from '@spartan-ng/ui-card-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { metaWith } from '../shared/meta/meta.util';
import { NgClass } from '@angular/common';
// import { ThreeHundredComponent } from './(home)/components/three-hundred.component';

export const routeMeta: RouteMeta = {
  meta: metaWith(
    'spartan - Cutting-edge tools powering Angular full-stack development',
    'Build next-level, full-stack applications with AnalogJs and the spartan/stack. Make them accessible and look incredible with spartan/ui.'
  ),
  title: 'spartan - Cutting-edge tools powering Angular full-stack development',
};

@Component({
  selector: 'spartan-home',
  imports: [
    HlmButtonDirective,
    RouterLink,
    HlmBadgeDirective,
    HlmCardImports,
    NgIcon,
    HlmIconDirective,
    NgClass,
    // ThreeHundredComponent,
  ],
  host: {
    class: 'block p-4 pb-12 pt-6 sm:pb-24 sm:pt-12',
  },
  providers: [
    provideIcons({
      lucideLayers,
      lucidePuzzle,
      lucideStar,
      lucideShield,
      lucideDatabase,
      lucideCircleCheck,
      lucideArrowRight,
      lucideServer,
      lucideBolt,
      lucideWand,
      diTypescriptOriginal,
      diGoOriginalWordmark,
      diRustOriginal,
      diPhpOriginal,
      diPythonOriginal,
    }),
  ],
  templateUrl: './home.page.html',
})
export default class HomePageComponent {
  container = 'mx-auto flex flex-col items-center gap-4 text-center';
  subHeading = 'font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl';
  lead = 'leading-normal text-muted-foreground sm:text-xl sm:leading-8';
}
