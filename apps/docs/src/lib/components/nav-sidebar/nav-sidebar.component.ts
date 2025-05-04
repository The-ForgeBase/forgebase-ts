import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { injectContentFiles } from '@analogjs/content';

import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSearch,
  lucideBook,
  lucideRocket,
  lucideSettings,
  lucideLayoutGrid,
  lucideCode,
  lucideImage,
  lucideList,
  lucideFileCode,
  lucideRepeat,
  lucideChevronDown,
  lucideSun,
  lucideMoon,
} from '@ng-icons/lucide';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { nestDocsAsSortedArrays, NestedDocEntry } from '../../utils/structures';
import { NavTreeComponent } from './nab-tree.component';

interface DocAttributes {
  title: string;
  slug: string;
  section: string;
  framework: string;
  order: number;
  description: string;
  icon?: string;
}

interface Framework {
  title: string;
  description: string;
  slug: string;
  icon?: string;
  framework: string;
}

@Component({
  selector: 'nav-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BrnSelectImports,
    HlmSelectImports,
    FormsModule,
    NgIcon,
    HlmIconDirective,
    NavTreeComponent,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideBook,
      lucideRocket,
      lucideSettings,
      lucideLayoutGrid,
      lucideCode,
      lucideImage,
      lucideList,
      lucideFileCode,
      lucideRepeat,
      lucideChevronDown,
      lucideSun,
      lucideMoon,
    }),
  ],
  host: {},
  template: `
    <nav class="flex flex-col h-full w-full gap-4">
      <div class="w-full">
        <h1
          class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 text-left"
        >
          Docs
        </h1>
      </div>
      <brn-select
        [ngModel]="currentFramework"
        (ngModelChange)="selectFramework($event)"
        class="w-full border-gray-200"
        placeholder="Select a framework"
        [value]="currentFramework()"
      >
        <hlm-select-trigger class="w-full border-gray-200 h-14">
          <hlm-select-value>
            <div
              class="flex flex-row items-center justify-start gap-x-3"
              *brnSelectValue="let value"
            >
              <div
                class="flex items-center justify-center p-2 rounded-[10px] border border-gray-200"
              >
                <ng-icon name="lucideBook" size="20" />
              </div>
              <div class="flex flex-col text-[#1a1a1a]">
                <h2
                  class="text-sm font-semibold text-left overflow-ellipsis p-0 m-0 text-[#1a1a1a]"
                >
                  {{ selectedFramework()?.title }}
                </h2>
                <p
                  class="text-xs text-muted-foreground overflow-ellipsis text-left  p-0 m-0 text-[#666666]"
                >
                  {{ selectedFramework()?.description }}
                </p>
              </div>
            </div>
          </hlm-select-value>
        </hlm-select-trigger>
        <hlm-select-content class="w-56">
          <hlm-option value="all">
            <div class="flex flex-row items-center justify-start gap-x-3">
              <div
                class="flex items-center justify-center p-2 rounded-[10px] border border-gray-200"
              >
                <ng-icon name="lucideBook" size="20" />
              </div>
              <div class="flex flex-col text-[#1a1a1a]">
                <h2
                  class="text-sm font-semibold text-left overflow-ellipsis p-0 m-0 text-[#1a1a1a]"
                >
                  All
                </h2>
                <p
                  class="text-xs text-muted-foreground overflow-ellipsis text-left  p-0 m-0 text-[#666666]"
                >
                  All frameworks
                </p>
              </div>
            </div>
          </hlm-option>
          @for (framework of frameworks(); track framework.framework) {
          <hlm-option [value]="framework.framework" class="p-2">
            <div class="flex flex-row items-center justify-start gap-x-3">
              <div
                class="flex items-center justify-center p-2 rounded-[10px] border border-gray-200"
              >
                <ng-icon name="lucideBook" size="20" />
              </div>
              {{ framework.slug }}
              <div class="flex flex-col text-[#1a1a1a]">
                <h2
                  class="text-sm font-semibold text-left overflow-ellipsis p-0 m-0 text-[#1a1a1a]"
                >
                  {{ framework.title }}
                </h2>
                <p
                  class="text-xs text-muted-foreground overflow-ellipsis text-left  p-0 m-0 text-[#666666]"
                >
                  {{ framework.description }}
                </p>
              </div>
            </div>
          </hlm-option>
          }
        </hlm-select-content>
      </brn-select>
      @if (selectedSection()) {
      <!--  -->

      @if (selectedSection()?.children) {

      <app-nav-tree
        [sections]="selectedSection()?.children!"
        [name]="selectedSection()?.name!"
        [slug]="selectedSection()?.slug!"
        [title]="selectedSection()?.attributes?.title!"
        [framework]="selectedFramework()?.framework!"
      ></app-nav-tree>

      } @else {
      <div class="item">
        <a [routerLink]="['/docs', selectedFramework()?.framework]">{{
          selectedSection()?.attributes?.title || selectedSection()?.name
        }}</a>
      </div>
      }
      <!--  -->
      }
    </nav>
  `,
})
export class NavSidebarComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private docs = injectContentFiles<DocAttributes>((file) =>
    file.filename.includes('/content/docs/')
  );

  private currentFramework$ = this.route.paramMap.pipe(
    map((params) => params.get('framework'))
  );
  currentFramework = signal<string | null>(null);

  sections = signal<NestedDocEntry[]>([]);
  selectedSection = signal<NestedDocEntry | undefined>(undefined);
  frameworks = signal<Framework[]>([]);
  selectedFramework = computed(() =>
    this.frameworks().find((f) => f.framework === this.currentFramework())
  );

  constructor() {
    this.organizeFrameworks();
    this.organizeDocs();
    this.currentFramework$.subscribe((framework) => {
      const frameworkSlug = framework;
      console.log(frameworkSlug);
      this.currentFramework.set(frameworkSlug?.toLowerCase() ?? null);
    });
    const nestedDocs = nestDocsAsSortedArrays(
      this.docs.map((doc) => ({
        filename: doc.filename,
        attributes: doc.attributes,
        slug: doc.attributes.slug,
      }))
    );
    console.log(nestedDocs);
    this.sections.set(nestedDocs);
  }

  private organizeFrameworks() {
    const frameworkMap = new Map<string, Framework>();

    for (const doc of this.docs) {
      if (doc.attributes.framework) {
        const framework = doc.attributes.framework;
        if (!frameworkMap.has(framework.toLowerCase())) {
          frameworkMap.set(framework.toLowerCase(), {
            framework: framework.toLowerCase(),
            title: doc.attributes.title,
            description: doc.attributes.description,
            slug: doc.attributes.slug.toLowerCase(),
            icon: doc.attributes.icon,
          });
        }
      }
    }

    this.frameworks.set(Array.from(frameworkMap.values()));
    if (this.frameworks().length > 0) {
      this.currentFramework.set(this.frameworks()[0].framework.toLowerCase());
    }
    this.organizeDocs();
  }

  private organizeDocs() {
    const currentFramework = this.selectedFramework()?.framework;

    const section = this.sections().find((s) => s.name === currentFramework);

    console.log('selectedSection', section);

    this.selectedSection.set(section);
  }

  selectFramework(framework: string) {
    console.log('selectFramework', framework);
    this.currentFramework.set(framework);
    // Navigation is now handled by routerLink
    this.organizeDocs();
  }

  toggleSection(section: NestedDocEntry) {
    this.sections.update((sections) =>
      sections.map((s) => ({
        ...s,
        isOpen: s === section ? !s.isOpen : s.isOpen,
      }))
    );
  }
}
