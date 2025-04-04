import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGithub, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';

import { FormAction } from '@analogjs/router';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';

type FormErrors =
  | {
      email?: string;
      password?: string;
      error?: string;
      [key: string]: string | undefined;
    }
  | undefined;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'auth-form',
  standalone: true,
  imports: [
    HlmButtonDirective,
    NgIcon,
    HlmIconDirective,
    HlmInputDirective,
    FormsModule,
    HlmLabelDirective,
    NgClass,
    FormAction,
  ],
  host: {
    class: 'block',
  },
  providers: [provideIcons({ lucideGithub, lucideLoaderCircle })],
  template: `
    <div class="mx-auto w-full justify-center space-y-6 sm:w-[350px]">
      <div class="space-y-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">
          Welcome to Forgebase Studio
        </h1>
        <p class="text-muted-foreground text-sm">
          Enter your email and password to log in to your account
        </p>
      </div>
      <div class="grid gap-6">
        <form
          method="post"
          (onSuccess)="onSuccess()"
          (onError)="onError($any($event))"
          (onStateChange)="errors.set(undefined)"
          class="grid gap-4"
        >
          @if (errors()?.error) {
          <p class="text-red-500">{{ errors()?.error }}</p>
          }
          <div class="flex flex-col gap-2 items-start justify-start">
            <label hlmLabel class="sr-only" for="email">Email</label>
            <input
              hlmInput
              class="w-full"
              [ngClass]="{
                'border-red-500': errors()?.email
              }"
              placeholder="Email"
              type="email"
              id="email"
              name="email"
              placeholder="name@example.com"
              required
            />
            @if (errors()?.email) {
            <p
              class="text-red-500 text-sm"
              [ngClass]="{
                'text-red-500': errors()?.email
              }"
            >
              {{ errors()?.email }}
            </p>
            }
          </div>
          <div class="flex flex-col gap-2 items-start justify-start">
            <label hlmLabel class="sr-only" for="password">Password</label>
            <input
              hlmInput
              class="w-full"
              [ngClass]="{
                'border-red-500': errors()?.password
              }"
              placeholder="Password"
              type="password"
              id="password"
              name="password"
              placeholder="********"
              required
            />
            @if (errors()?.password) {
            <p
              class="text-red-500 text-sm"
              [ngClass]="{
                'text-red-500': errors()?.password
              }"
            >
              {{ errors()?.password }}
            </p>
            }
          </div>
          <button
            hlmBtn
            [disabled]="isLoading()"
            class="mt-2 w-full"
            type="submit"
            (click)="send()"
          >
            @if (isLoading()) {
            <ng-icon
              hlm
              name="lucideLoaderCircle"
              size="sm"
              class="mr-2 animate-spin"
            />
            } Sign In with Email
          </button>
        </form>
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t"></span>
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-background text-muted-foreground px-2"
              >Or continue with</span
            >
          </div>
        </div>
        <button hlmBtn variant="outline" [disabled]="isLoading()">
          @if (isLoading()) {
          <ng-icon
            hlm
            name="lucideLoaderCircle"
            size="sm"
            class="mr-2 animate-spin"
          />
          } @else {
          <ng-icon hlm class="mr-2" size="sm" name="lucideGithub" />
          } GitHub
        </button>
      </div>
      <p class="text-muted-foreground text-center text-sm sm:px-8">
        By clicking continue, you agree to our
        <a
          class="hover:text-primary cursor-pointer underline underline-offset-4"
          >Terms of Service</a
        >
        and
        <a
          class="hover:text-primary cursor-pointer underline underline-offset-4"
          >Privacy Policy</a
        >
        .
      </p>
    </div>
  `,
})
export class AuthenticationFormComponent {
  router = inject(Router);

  public isLoading = signal(false);
  errors = signal<FormErrors>(undefined);

  onSuccess() {
    console.log('Form submitted successfully');
    this.isLoading.set(false);
    // this.router.navigate(['/studio']);
  }

  onError(result?: FormErrors) {
    this.errors.set(result);
    this.isLoading.set(false);
    console.log('Form submission failed', result);
  }

  send() {
    this.isLoading.set(true);
  }
}
