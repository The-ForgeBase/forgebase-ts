import { Component, effect, inject } from '@angular/core';
import { injectContent, MarkdownComponent } from '@analogjs/content';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';

interface DocAttributes {
  title: string;
  slug: string;
  description?: string;
  framework: string;
  section: string;
  order: number;
}

@Component({
  standalone: true,
  imports: [MarkdownComponent],
  template: `
    @if (doc() !== undefined) {
    <article class="doc-content">
      <header>
        <h1>{{ doc()!.attributes.title }}</h1>
        @if (doc()!.attributes.description) {
        <p class="description">{{ doc()!.attributes.description }}</p>
        }
      </header>

      <analog-markdown [content]="doc()!.content"></analog-markdown>
    </article>
    }
  `,
  styles: [
    `
      .doc-content {
        max-width: 100%;
        margin: 0 auto;
      }

      .description {
        color: var(--text-muted);
        font-size: 1.1rem;
        margin-top: -1rem;
        margin-bottom: 2rem;
      }
    `,
  ],
})
export default class FrameworkDocPage {
  private route = inject(ActivatedRoute);

  readonly doc$ = this.route.paramMap.pipe(
    switchMap((params) => {
      const framework = params.get('framework');
      const slug = params.get('slug');
      return injectContent<DocAttributes>({
        customFilename: `docs/${framework}/${slug}`,
      });
    })
  );

  readonly doc = toSignal(this.doc$);

  constructor() {
    effect(() => {
      console.log('from framework doc page');
      console.log(this.doc());
    });
  }
}
