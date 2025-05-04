import { Component, effect, ViewEncapsulation } from '@angular/core';
import { injectContent, MarkdownComponent } from '@analogjs/content';
import { toSignal } from '@angular/core/rxjs-interop';

interface IndexAttributes {
  title: string;
  description: string;
}

@Component({
  standalone: true,
  imports: [MarkdownComponent],
  template: `
    @if (content()) {
    <analog-markdown [content]="content()!.content"></analog-markdown>
    }
  `,
  encapsulation: ViewEncapsulation.None,
  styles: [``],
})
export default class DocsIndexPage {
  readonly content$ = injectContent<IndexAttributes>({
    customFilename: 'docs/index',
  });
  readonly content = toSignal(this.content$);

  constructor() {
    effect(() => {
      // console.log(this.content());
    });
  }
}
