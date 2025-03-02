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
        CardModule
    ],
    template: `
        <div class="flex justify-content-center align-items-center min-h-screen bg-gray-900">
            <p-card class="w-full max-w-md mx-auto shadow-lg">
                <div class="text-center mb-5">
                    <h2 class="text-3xl font-bold text-gray-800 mb-2">Sign In</h2>
                    <p class="text-gray-600">Access your ForgeBase account</p>
                </div>
                
                <div class="mb-4">
                    <label for="email" class="block text-gray-700 font-medium mb-2">Email</label>
                    <span class="p-input-icon-left w-full">
                        <i class="pi pi-envelope"></i>
                        <input id="email" type="text" pInputText class="w-full" placeholder="Email address" [(ngModel)]="email">
                    </span>
                </div>
                
                <div class="mb-4">
                    <label for="password" class="block text-gray-700 font-medium mb-2">Password</label>
                    <p-password id="password" [(ngModel)]="password" [toggleMask]="true" styleClass="w-full" [feedback]="false" placeholder="Enter your password"></p-password>
                </div>
                
                <div class="flex justify-content-between align-items-center mb-4">
                    <div class="flex align-items-center">
                        <p-checkbox [(ngModel)]="rememberMe" [binary]="true" inputId="rememberMe"></p-checkbox>
                        <label for="rememberMe" class="ml-2 text-gray-700">Remember me</label>
                    </div>
                    <a href="#" class="text-blue-500 hover:text-blue-700 no-underline">Forgot password?</a>
                </div>
                
                <button pButton label="Sign In" icon="pi pi-sign-in" class="w-full p-button-primary mb-4"></button>
                
                <p-divider align="center">
                    <span class="text-gray-600">OR</span>
                </p-divider>
                
                <div class="flex justify-content-center gap-3 mt-4">
                    <button pButton icon="pi pi-google" class="p-button-rounded p-button-secondary p-button-outlined"></button>
                    <button pButton icon="pi pi-facebook" class="p-button-rounded p-button-secondary p-button-outlined"></button>
                    <button pButton icon="pi pi-github" class="p-button-rounded p-button-secondary p-button-outlined"></button>
                </div>
                
                <div class="text-center mt-4">
                    <span class="text-gray-600">Don't have an account?</span>
                    <a href="#" class="text-blue-500 hover:text-blue-700 ml-2 no-underline">Sign up</a>
                </div>
            </p-card>
        </div>
    `
})
export default class SigninComponent {
    email: string = '';
    password: string = '';
    rememberMe: boolean = false;
}