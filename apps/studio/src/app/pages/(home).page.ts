import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'studio-home',
  imports: [ButtonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <!-- Hero Section -->
      <div class="container mx-auto px-4 py-20">
        <div class="text-center">
          <h1 class="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            ForgeBase
          </h1>
          <p class="text-xl text-gray-300 mb-8">
            A powerful Backend as a Service framework for modern applications
          </p>
          <p-button label="Get Started" />
        </div>
      </div>

      <!-- Features Grid -->
      <div class="container mx-auto px-4 py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- API Feature -->
          <div class="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition duration-300">
            <div class="text-blue-400 text-3xl mb-4">🔌</div>
            <h3 class="text-xl font-semibold mb-2">API Integration</h3>
            <p class="text-gray-400">Seamless API integration with built-in authentication and security features.</p>
          </div>

          <!-- Auth Feature -->
          <div class="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition duration-300">
            <div class="text-green-400 text-3xl mb-4">🔐</div>
            <h3 class="text-xl font-semibold mb-2">Authentication</h3>
            <p class="text-gray-400">Robust authentication system with multiple providers and role-based access control.</p>
          </div>

          <!-- Database Feature -->
          <div class="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition duration-300">
            <div class="text-purple-400 text-3xl mb-4">💾</div>
            <h3 class="text-xl font-semibold mb-2">Database</h3>
            <p class="text-gray-400">Powerful database solutions with real-time synchronization capabilities.</p>
          </div>

          <!-- Real-time Feature -->
          <div class="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition duration-300">
            <div class="text-yellow-400 text-3xl mb-4">⚡</div>
            <h3 class="text-xl font-semibold mb-2">Real-time Updates</h3>
            <p class="text-gray-400">Live data updates and real-time communication between clients and server.</p>
          </div>

          <!-- Storage Feature -->
          <div class="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition duration-300">
            <div class="text-red-400 text-3xl mb-4">📦</div>
            <h3 class="text-xl font-semibold mb-2">Storage</h3>
            <p class="text-gray-400">Scalable file storage solution with built-in CDN and optimization features.</p>
          </div>

          <!-- Security Feature -->
          <div class="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition duration-300">
            <div class="text-teal-400 text-3xl mb-4">🛡️</div>
            <h3 class="text-xl font-semibold mb-2">Security</h3>
            <p class="text-gray-400">Enterprise-grade security with encryption and compliance features.</p>
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="container mx-auto px-4 py-16 text-center">
        <h2 class="text-4xl font-bold mb-6">Ready to Build Something Amazing?</h2>
        <p class="text-xl text-gray-300 mb-8">
          Start creating powerful applications with ForgeBase today
        </p>
        <div class="space-x-4">
          <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300">
            Documentation
          </button>
          <button class="bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-bold py-3 px-8 rounded-lg transition duration-300">
            View Examples
          </button>
        </div>
      </div>
    </div>
  `
})
export default class HomeComponent {}
