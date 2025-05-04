// import { Component, effect, inject } from '@angular/core';
// import { injectContent, MarkdownComponent } from '@analogjs/content';
// import { AsyncPipe } from '@angular/common';
// import { ActivatedRoute } from '@angular/router';
// import { switchMap } from 'rxjs';
// import { toSignal } from '@angular/core/rxjs-interop';

// interface DocAttributes {
//   title: string;
//   slug: string;
//   description?: string;
//   section: string;
//   order: number;
// }

// @Component({
//   standalone: true,
//   imports: [MarkdownComponent, AsyncPipe],
//   template: `
//     @if (doc$ | async; as doc) {
//     <article class="doc-content">
//       <header>
//         <h1>{{ doc.attributes.title }}</h1>
//         @if (doc.attributes.description) {
//         <p class="description">{{ doc.attributes.description }}</p>
//         }
//       </header>

//       <analog-markdown [content]="doc.content"></analog-markdown>
//     </article>
//     }
//   `,
//   styles: [
//     `
//       .doc-content {
//         max-width: 100%;
//         margin: 0 auto;
//       }

//       .description {
//         color: var(--text-muted);
//         font-size: 1.1rem;
//         margin-top: -1rem;
//         margin-bottom: 2rem;
//       }
//     `,
//   ],
// })
// export default class DocPage {
//   private route = inject(ActivatedRoute);

//   readonly doc$ = this.route.paramMap.pipe(
//     switchMap((params) => {
//       const slug = params.get('slug');
//       return injectContent<DocAttributes>({
//         customFilename: `docs/${slug}`,
//       });
//     })
//   );

//   readonly doc = toSignal(this.doc$);

//   constructor() {
//     effect(() => {
//       console.log('from slug page');
//       console.log(this.doc());
//     });
//   }
// }
