import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  PLATFORM_ID,
  OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgIf, NgTemplateOutlet } from '@angular/common';

/**
 * A directive that conditionally renders content only in browser environments.
 * Uses ng-template pattern internally for cleaner implementation.
 * Used to prevent hydration errors and improve SSR compatibility.
 *
 * @example
 * ```html
 * <div *useClient>
 *   <!-- This content will only render in the browser -->
 *   <chart-component></chart-component>
 * </div>
 *
 * <div *useClient="false">
 *   <!-- This content will only render during SSR -->
 *   <static-placeholder></static-placeholder>
 * </div>
 * ```
 */
@Directive({
  selector: '[useClient]',
  standalone: true,
  hostDirectives: [
    {
      directive: NgIf,
      inputs: ['ngIf'],
    },
  ],
})
export class UseClientDirective implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private ngIfDirective = inject(NgIf);

  // Default is to show in browser
  private _showInBrowser = true;

  /**
   * Sets whether to render content in the browser.
   * @param showInBrowser Whether to render in the browser (default: true)
   */
  @Input()
  set useClient(showInBrowser: boolean | any) {
    // If the value is undefined, we assume true
    // This allows us to use the directive without passing a value
    // and still have it default to true
    // This is useful for cases where we want to render in the browser
    // but don't want to pass a value explicitly
    // For example: <div *useClient></div>
    // If no value is passed, assume true
    this._showInBrowser = showInBrowser !== false;
    this.updateView();
  }

  ngOnInit(): void {
    this.updateView();
  }

  /**
   * Updates the view based on the platform and the desired rendering condition
   * by setting the ngIf condition appropriately
   */
  private updateView(): void {
    // Should render when we're in a browser and showInBrowser is true
    // OR when we're in SSR and showInBrowser is false
    const shouldRender =
      (this.isBrowser && this._showInBrowser) ||
      (!this.isBrowser && !this._showInBrowser);

    // Set the ngIf condition to control rendering
    this.ngIfDirective.ngIf = shouldRender;
  }
}
