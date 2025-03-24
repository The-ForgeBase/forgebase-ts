import type { RouteMeta } from '@analogjs/router';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmSeparatorDirective } from '@spartan-ng/ui-separator-helm';
import { hlmH3, hlmMuted } from '@spartan-ng/ui-typography-helm';

export const routeMeta: RouteMeta = {
	data: { breadcrumb: 'Not Found' },
	title: 'forgebase - Page not found',
};

@Component({
	selector: 'spartan-not-found',
	standalone: true,
	imports: [HlmSeparatorDirective, HlmButtonDirective, RouterLink],
	host: {
		class: 'h-full flex flex-col items-center justify-center',
	},
	template: `
		<div class="-mt-[25%] mb-8 flex items-center">
			<h1 class="${hlmH3}">404</h1>
			<hr hlmSeparator class="mx-4 h-8" orientation="vertical" />
			<p class="${hlmMuted}">This page could not be found</p>
		</div>
		<a routerLink="/" size="sm" class="text-xs" hlmBtn variant="link">Back home</a>
	`,
})
export default class NotFoundComponent {}