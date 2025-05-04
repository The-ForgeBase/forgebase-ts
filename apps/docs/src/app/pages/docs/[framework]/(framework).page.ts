import { Component, effect, inject } from '@angular/core';
import { injectContent, MarkdownComponent } from '@analogjs/content';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';

interface IndexAttributes {
  title: string;
  description: string;
  framework: string;
}

@Component({
  standalone: true,
  imports: [MarkdownComponent],
  template: `
    @if (content() !== undefined) {
    <h1>{{ content()!.attributes.title }}</h1>
    <p>{{ content()!.attributes.description }}</p>
    <analog-markdown [content]="content()!.content"></analog-markdown>
    }
  `,
})
export default class FrameworkIndexPage {
  private route = inject(ActivatedRoute);

  readonly content$ = this.route.paramMap.pipe(
    map((params) => params.get('framework')),
    switchMap((framework) =>
      injectContent<IndexAttributes>({
        customFilename: `docs/${framework}/index`,
      })
    )
  );

  readonly content = toSignal(this.content$);

  constructor() {
    effect(() => {
      // console.log('From framework index page');
      // console.log(this.content());
    });
  }
}
