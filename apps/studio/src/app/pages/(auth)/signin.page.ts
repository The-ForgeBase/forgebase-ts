import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { FormAction } from '@analogjs/router';

type FormErrors =
  | {
      email?: string;
      password?: string;
    }
  | undefined;

@Component({
  selector: 'studio-signin',
  standalone: true,
  imports: [
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    DividerModule,
    CardModule,
    FormAction,
  ],
  template: `
    <div class="flex justify-center items-center min-h-screen bg-white">
      <div class="w-full max-w-md mx-auto p-5">
        <!-- Logo and Header -->
        <div class="flex align-items-center mb-8">
          <div class="flex items-center">
            <span
              class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-green-400"
              >ForgeBase</span
            >
          </div>
        </div>

        <div class="mb-8">
          <h2 class="text-3xl font-medium text-gray-900 mb-1">Welcome back</h2>
          <p class="text-gray-600">Sign in to your account</p>
        </div>

        <!-- Social Login Buttons -->
        <div class="mb-4">
          <button
            pButton
            icon="pi pi-github"
            label="Continue with GitHub"
            class="w-full mb-2 p-button-outlined justify-content-center align-items-center"
            [style]="{
              color: '#333',
              'border-color': '#ccc',
              'font-weight': 'normal',
              height: '48px'
            }"
          ></button>

          <button
            pButton
            icon="pi pi-lock"
            label="Continue with SSO"
            class="w-full p-button-outlined justify-content-center align-items-center"
            [style]="{
              color: '#333',
              'border-color': '#ccc',
              'font-weight': 'normal',
              height: '48px'
            }"
          ></button>
        </div>

        <!-- Divider -->
        <div class="flex align-items-center my-4">
          <div
            class="flex-grow-1"
            style="height: 1px; background-color: #e2e8f0;"
          ></div>
          <span class="px-3 text-gray-500 text-sm">or</span>
          <div
            class="flex-grow-1"
            style="height: 1px; background-color: #e2e8f0;"
          ></div>
        </div>

        <!-- Form -->
        <form
          method="post"
          (onSuccess)="onSuccess()"
          (onError)="onError($any($event))"
          (onStateChange)="errors.set(undefined)"
        >
          <div class="mb-4">
            <label
              for="email"
              class="block text-gray-700 text-sm font-medium mb-2"
              >Email</label
            >
            <input
              id="email"
              type="text"
              name="email"
              pInputText
              class="w-full"
              placeholder="you@example.com"
              [style]="{ height: '44px', 'border-color': '#e2e8f0' }"
            />
          </div>

          <div class="mb-4">
            <label
              for="password"
              class="block text-gray-700 text-sm font-medium"
              >Password</label
            >
            <input
              id="password"
              type="password"
              name="password"
              pInputText
              class="w-full"
              placeholder="••••••••"
              [style]="{ height: '44px', 'border-color': '#e2e8f0' }"
            />
          </div>

          <div class="flex justify-content-end mb-4">
            <a
              href="#"
              class="text-sm text-green-600 hover:text-green-700 no-underline font-medium"
              >Forgot Password?</a
            >
          </div>

          <button
            pButton
            label="Sign In"
            type="submit"
            class="w-full"
            [style]="{
              'background-color': '#3ECF8E',
              'border-color': '#3ECF8E',
              height: '44px',
              'font-weight': 'normal'
            }"
          ></button>

          <!-- <div class="text-center mt-6">
            <span class="text-gray-600 text-sm">Don't have an account?</span>
            <a
              href="#"
              class="text-green-600 hover:text-green-700 ml-1 text-sm no-underline font-medium"
              >Sign Up Now</a
            >
          </div> -->
        </form>

        <p-button (onClick)="getAdmins()" label="Footer Button"></p-button>

        <!-- Footer -->
        <div class="text-center mt-8 text-xs text-gray-500">
          <p>
            By continuing, you agree to Supabase's
            <a href="#" class="text-gray-700 hover:text-gray-900"
              >Terms of Service</a
            >
            and
            <a href="#" class="text-gray-700 hover:text-gray-900"
              >Privacy Policy</a
            >, and to receive periodic emails with updates.
          </p>
        </div>
      </div>
    </div>
  `,
})
export default class SigninComponent {
  errors = signal<FormErrors>(undefined);

  onSuccess() {
    console.log('Form submitted successfully');
  }

  onError(result?: FormErrors) {
    this.errors.set(result);
  }

  getAdmins() {
    fetch('/api/v1/hello', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Admins:', data);
      })
      .catch((error) => {
        console.error('Error fetching admins:', error);
      });
  }
}
