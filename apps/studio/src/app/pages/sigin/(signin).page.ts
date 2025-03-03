import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';

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
  ],
  template: `
    <div
      class="flex justify-content-center align-items-center min-h-screen bg-white"
    >
      <div class="w-full max-w-md mx-auto p-5">
        <!-- Logo and Header -->
        <div class="flex align-items-center mb-8">
          <div class="mr-2">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 0C8.05875 0 0 8.05875 0 18C0 27.9412 8.05875 36 18 36C27.9412 36 36 27.9412 36 18C36 8.05875 27.9412 0 18 0ZM24.9225 25.5487C24.9 25.8412 24.69 26.0887 24.4013 26.1975C24.1013 26.3137 23.7675 26.2575 23.5237 26.0513C21.21 24.09 18.2925 23 15.3 23C13.4363 23 11.64 23.3812 9.9675 24.1275C9.77625 24.2137 9.57375 24.2362 9.3825 24.2025C9.03 24.1387 8.71875 23.9488 8.53875 23.6513C8.43 23.46 8.36625 23.2425 8.36625 23.0187C8.36625 22.5887 8.61375 22.1825 9.0075 21.9662C11.07 20.9887 13.3088 20.5 15.6075 20.5C19.1062 20.5 22.53 21.7887 25.2225 24.1275C25.6163 24.4688 25.7513 25.0312 25.5225 25.5C25.5337 25.5162 25.9225 25.5487 24.9225 25.5487ZM27.42 19.7925C27.2813 20.1487 26.9925 20.4075 26.6287 20.5162C26.5013 20.5537 26.3663 20.5725 26.235 20.5725C26.0175 20.5725 25.8 20.5162 25.6013 20.4037C23.3363 19.0837 20.5725 18.375 17.7 18.375C15.12 18.375 12.63 18.9225 10.3163 19.9912C9.69375 20.2575 8.97 19.9538 8.7 19.3312C8.565 19.0275 8.55375 18.69 8.66625 18.375C8.78625 18.0562 9.01125 17.8012 9.315 17.6662C12.0038 16.425 14.8388 15.7875 17.7 15.7875C20.97 15.7875 24.1387 16.6088 26.8425 18.1462C27.1462 18.315 27.3788 18.585 27.495 18.9075C27.6075 19.2262 27.5887 19.5675 27.42 19.7925ZM30.0525 13.7663C29.7937 14.2387 29.3175 14.535 28.8037 14.5837C28.6238 14.6025 28.4438 14.5837 28.2675 14.535C27.9075 14.4262 27.5963 14.2125 27.3788 13.905C24.8213 10.5713 20.97 8.69625 16.875 8.69625C14.0625 8.69625 11.3513 9.4275 8.89875 10.8675C8.6475 11.0138 8.36625 11.0888 8.08125 11.07C7.4925 11.0325 6.975 10.6837 6.7575 10.1625C6.6075 9.82875 6.58875 9.45375 6.69375 9.1125C6.8025 8.76375 7.02 8.4675 7.33125 8.2725C10.2375 6.5175 13.4888 5.625 16.8787 5.625C21.7688 5.625 26.37 7.86 29.4113 11.8425C29.8575 12.4162 29.8013 13.2487 29.2763 13.7475C29.295 13.7288 30.0525 13.7663 30.0525 13.7663Z"
                fill="#3ECF8E"
              />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-gray-900">supabase</h1>
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
        <div>
          <div class="mb-4">
            <label
              for="email"
              class="block text-gray-700 text-sm font-medium mb-2"
              >Email</label
            >
            <input
              id="email"
              type="text"
              pInputText
              class="w-full"
              placeholder="you@example.com"
              [(ngModel)]="email"
              [style]="{ height: '44px', 'border-color': '#e2e8f0' }"
            />
          </div>

          <div class="mb-2">
            <div class="flex justify-content-between align-items-center mb-2">
              <label
                for="password"
                class="block text-gray-700 text-sm font-medium"
                >Password</label
              >
            </div>
            <p-password
              id="password"
              [(ngModel)]="password"
              [toggleMask]="true"
              styleClass="w-full"
              [feedback]="false"
              placeholder="••••••••"
              [style]="{ height: '44px' }"
              inputStyleClass="w-full"
              [inputStyle]="{ height: '44px' }"
            >
            </p-password>
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
            class="w-full"
            [style]="{
              'background-color': '#3ECF8E',
              'border-color': '#3ECF8E',
              height: '44px',
              'font-weight': 'normal'
            }"
          ></button>

          <div class="text-center mt-6">
            <span class="text-gray-600 text-sm">Don't have an account?</span>
            <a
              href="#"
              class="text-green-600 hover:text-green-700 ml-1 text-sm no-underline font-medium"
              >Sign Up Now</a
            >
          </div>
        </div>

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
  email: string = '';
  password: string = '';
}
