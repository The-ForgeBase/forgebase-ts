import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import {
  HlmCardDirective,
  HlmCardContentDirective,
  HlmCardDescriptionDirective,
  HlmCardFooterDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
} from '@spartan-ng/ui-card-helm';
import {
  BrnSheetContentDirective,
  BrnSheetTriggerDirective,
} from '@spartan-ng/brain/sheet';
import {
  HlmSheetComponent,
  HlmSheetContentComponent,
  HlmSheetFooterComponent,
  HlmSheetHeaderComponent,
  HlmSheetTitleDirective,
} from '@spartan-ng/ui-sheet-helm';
import {
  lucideArrowRight,
  lucideDatabase,
  lucideGithub,
  lucideServer,
  lucideShield,
  lucideLayoutDashboard,
  lucideSettings,
  lucideChrome,
  lucideBox,
  lucideUsers,
  lucideKey,
  lucideLogOut,
  lucideCircleCheck,
  lucideBolt,
  lucideCode,
  lucideBook,
  lucideCpu,
  lucideGlobe,
  lucideWand,
  lucideZap,
  lucideRocket,
  lucideFileJson,
  lucideCodepen,
  lucideFileCode,
  lucideMenu,
  lucideX,
} from '@ng-icons/lucide';
import {
  diTypescriptOriginal,
  diGoOriginalWordmark,
  diRustOriginal,
  diPythonOriginal,
  diPhpOriginal,
} from '@ng-icons/devicon/original';

@Component({
  selector: 'studio-home',
  standalone: true,
  imports: [
    ButtonModule,
    RouterLink,
    CardModule,
    DividerModule,
    NgIcon,
    HlmButtonDirective,
    HlmIconDirective,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardDescriptionDirective,
    HlmCardContentDirective,
    HlmCardFooterDirective,
    HlmSheetComponent,
    HlmSheetContentComponent,
    HlmSheetHeaderComponent,
    HlmSheetFooterComponent,
    HlmSheetTitleDirective,
    BrnSheetTriggerDirective,
    BrnSheetContentDirective,
  ],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideGithub,
      lucideDatabase,
      lucideServer,
      lucideShield,
      lucideLayoutDashboard,
      lucideSettings,
      lucideChrome,
      lucideBox,
      lucideUsers,
      lucideKey,
      lucideLogOut,
      lucideCircleCheck,
      lucideBolt,
      lucideCode,
      lucideCpu,
      lucideGlobe,
      lucideWand,
      lucideZap,
      lucideRocket,
      lucideBook,
      lucideFileJson,
      lucideCodepen,
      lucideFileCode,
      diTypescriptOriginal,
      diGoOriginalWordmark,
      diRustOriginal,
      diPythonOriginal,
      diPhpOriginal,
      lucideMenu,
      lucideX,
    }),
  ],
  templateUrl: './home.page.html',
})
export default class HomeComponent {
  isOpen = signal(false);
}
