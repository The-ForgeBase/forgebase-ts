import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { withPrismHighlighter } from '@analogjs/content/prism-highlighter';
import 'prismjs/plugins/diff-highlight/prism-diff-highlight';
import 'prismjs/components/prism-diff';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideFileRouter(),
    provideContent(
      withMarkdownRenderer({
        loadMermaid: () => import('mermaid'),
      }),
      withPrismHighlighter()
    ),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestContextInterceptor])
    ),
    provideAnimationsAsync(),
    // providePrimeNG({
    //   ripple: true,
    //   theme: {
    //     preset: MyPreset,
    //     options: {
    //       cssLayer: {
    //         name: 'primeng',
    //         order: 'tailwind-base, primeng, tailwind-utilities',
    //       },
    //     },
    //   },
    // }),
  ],
};
