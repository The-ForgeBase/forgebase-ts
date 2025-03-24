import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'studio-home',
  standalone: true,
  imports: [ButtonModule, RouterLink, CardModule, DividerModule],
  template: `
    <div class="min-h-screen bg-white text-gray-800 font-sans">
      <!-- Navbar with more rounded corners -->
      <nav
        class="container mx-auto px-4 py-6 flex justify-between items-center"
      >
        <div class="flex items-center">
          <span
            class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-green-400"
            >ForgeBase</span
          >
        </div>
        <div class="hidden md:flex space-x-6">
          <a href="#" class="text-gray-600 hover:text-teal-600 transition"
            >Documentation</a
          >
          <a href="#" class="text-gray-600 hover:text-teal-600 transition"
            >Pricing</a
          >
          <a href="#" class="text-gray-600 hover:text-teal-600 transition"
            >Blog</a
          >
          <a href="#" class="text-gray-600 hover:text-teal-600 transition"
            >GitHub</a
          >
        </div>
        <div>
          <p-button
            label="Sign In"
            styleClass="p-button-text mr-2 text-gray-600 rounded-full"
            routerLink="/signin"
          />
          <p-button
            label="Start your project"
            styleClass="p-button-outlined border-teal-500 text-teal-600 rounded-full"
            routerLink="/signin"
          />
        </div>
      </nav>

      <!-- Hero Section with wood texture background -->
      <div
        class="py-16 bg-[url('/api/placeholder/1200/400')] bg-cover bg-center bg-no-repeat relative"
      >
        <!-- Overlay to ensure text readability -->
        <div class="absolute inset-0 bg-white bg-opacity-85"></div>
        <div class="container mx-auto px-4 pt-16 pb-24 relative">
          <div class="max-w-3xl mx-auto text-center">
            <h1
              class="text-5xl md:text-6xl font-bold mb-6 leading-tight text-gray-800"
            >
              The
              <span
                class="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-green-400"
              >
                Cloud-Native
              </span>
              Backend Solution
            </h1>
            <p class="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Create your backend in minutes. Start your project with a Postgres
              Database, Authentication, instant APIs, and realtime
              subscriptions.
            </p>
            <div class="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <p-button
                label="Start your project"
                styleClass="p-button-lg bg-teal-500 hover:bg-teal-600 border-none text-white rounded-full"
              />
              <p-button
                label="Documentation"
                styleClass="p-button-lg p-button-outlined border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full"
              />
            </div>

            <!-- Code Preview with more rounded corners -->
            <div
              class="bg-white rounded-2xl p-6 text-left overflow-hidden shadow-lg border border-gray-200 max-w-2xl mx-auto"
            >
              <pre class="text-sm text-gray-700 overflow-x-auto">
                <span class="text-blue-600">const</span> <span class="text-green-600"></span> = <span class="text-purple-600">await</span> forgebase
                .<span class="text-teal-600">from</span>('profiles')
                .<span class="text-teal-600">select</span>('id, username, avatar_url')
                .<span class="text-teal-600">eq</span>('is_active', true)
              </pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Section with natural pattern -->
      <div
        class="bg-[url('/api/placeholder/1200/200')] bg-repeat relative py-16"
      >
        <div class="absolute inset-0 bg-teal-50 bg-opacity-95"></div>
        <div class="container mx-auto px-4 relative">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div class="bg-white bg-opacity-80 rounded-2xl p-6 shadow-sm">
              <div class="text-4xl font-bold text-teal-600">10M+</div>
              <div class="text-gray-600 mt-2">Downloads</div>
            </div>
            <div class="bg-white bg-opacity-80 rounded-2xl p-6 shadow-sm">
              <div class="text-4xl font-bold text-teal-600">150K+</div>
              <div class="text-gray-600 mt-2">Active Projects</div>
            </div>
            <div class="bg-white bg-opacity-80 rounded-2xl p-6 shadow-sm">
              <div class="text-4xl font-bold text-teal-600">30K+</div>
              <div class="text-gray-600 mt-2">GitHub Stars</div>
            </div>
            <div class="bg-white bg-opacity-80 rounded-2xl p-6 shadow-sm">
              <div class="text-4xl font-bold text-teal-600">250+</div>
              <div class="text-gray-600 mt-2">Contributors</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Grid with more rounded corners -->
      <div class="container mx-auto px-4 py-24 bg-white">
        <h2 class="text-4xl font-bold text-center mb-16 text-gray-800">
          Everything you need to build modern apps
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Database Feature -->
          <div
            class="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-200 transition duration-300"
          >
            <div
              class="bg-teal-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            >
              <span class="text-teal-600 text-3xl">💾</span>
            </div>
            <h3 class="text-xl font-semibold mb-3 text-gray-800">
              Postgres Database
            </h3>
            <p class="text-gray-600">
              Every project is a full Postgres database, the world's most
              trusted relational database.
            </p>
          </div>

          <!-- Auth Feature -->
          <div
            class="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition duration-300"
          >
            <div
              class="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            >
              <span class="text-blue-600 text-3xl">🔐</span>
            </div>
            <h3 class="text-xl font-semibold mb-3 text-gray-800">
              Authentication
            </h3>
            <p class="text-gray-600">
              User management with row level security, social providers, and
              multiple auth methods.
            </p>
          </div>

          <!-- API Feature -->
          <div
            class="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-200 transition duration-300"
          >
            <div
              class="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            >
              <span class="text-green-600 text-3xl">🔌</span>
            </div>
            <h3 class="text-xl font-semibold mb-3 text-gray-800">
              Auto-generated APIs
            </h3>
            <p class="text-gray-600">
              Instantly available REST and GraphQL APIs with your database
              schema as the source of truth.
            </p>
          </div>

          <!-- Real-time Feature -->
          <div
            class="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-200 transition duration-300"
          >
            <div
              class="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            >
              <span class="text-amber-600 text-3xl">⚡</span>
            </div>
            <h3 class="text-xl font-semibold mb-3 text-gray-800">Realtime</h3>
            <p class="text-gray-600">
              Listen to database changes and build reactive applications with
              websockets.
            </p>
          </div>

          <!-- Storage Feature -->
          <div
            class="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-200 transition duration-300"
          >
            <div
              class="bg-rose-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            >
              <span class="text-rose-600 text-3xl">📦</span>
            </div>
            <h3 class="text-xl font-semibold mb-3 text-gray-800">Storage</h3>
            <p class="text-gray-600">
              Store, organize, and serve large files with policies and
              permissions.
            </p>
          </div>

          <!-- Security Feature -->
          <div
            class="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-200 transition duration-300"
          >
            <div
              class="bg-teal-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            >
              <span class="text-teal-600 text-3xl">🛡️</span>
            </div>
            <h3 class="text-xl font-semibold mb-3 text-gray-800">
              Edge Functions
            </h3>
            <p class="text-gray-600">
              Run custom code globally with low latency, directly from your
              database.
            </p>
          </div>
        </div>
      </div>

      <!-- Testimonials Section with wood texture background -->
      <div
        class="bg-[url('/api/placeholder/1200/300')] bg-cover bg-center relative py-24"
      >
        <div class="absolute inset-0 bg-white bg-opacity-90"></div>
        <div class="container mx-auto px-4 relative">
          <h2 class="text-4xl font-bold text-center mb-16 text-gray-800">
            Trusted by thousands of developers
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              class="bg-white p-8 rounded-2xl border border-gray-200 shadow-md"
            >
              <p class="text-gray-700 mb-6">
                "ForgeBase has transformed how we build applications. The
                real-time features and authentication system saved us months of
                development time."
              </p>
              <div class="flex items-center">
                <div class="w-16 h-16 bg-teal-100 rounded-full mr-4"></div>
                <div>
                  <div class="font-semibold text-gray-800">Alex Rivera</div>
                  <div class="text-gray-600 text-sm">CTO, TechCorp</div>
                </div>
              </div>
            </div>
            <div
              class="bg-white p-8 rounded-2xl border border-gray-200 shadow-md"
            >
              <p class="text-gray-700 mb-6">
                "We migrated from Firebase to ForgeBase and couldn't be happier.
                The SQL foundation gives us flexibility while maintaining the
                ease of use."
              </p>
              <div class="flex items-center">
                <div class="w-16 h-16 bg-teal-100 rounded-full mr-4"></div>
                <div>
                  <div class="font-semibold text-gray-800">Samira Johnson</div>
                  <div class="text-gray-600 text-sm">
                    Lead Developer, StartupX
                  </div>
                </div>
              </div>
            </div>
            <div
              class="bg-white p-8 rounded-2xl border border-gray-200 shadow-md"
            >
              <p class="text-gray-700 mb-6">
                "The documentation and community support are outstanding. Any
                question we had was either in the docs or quickly answered on
                GitHub."
              </p>
              <div class="flex items-center">
                <div class="w-16 h-16 bg-teal-100 rounded-full mr-4"></div>
                <div>
                  <div class="font-semibold text-gray-800">Marco Chen</div>
                  <div class="text-gray-600 text-sm">Indie Developer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Call to Action with natural leaf pattern background -->
      <div
        class="py-24 bg-[url('/api/placeholder/1200/300')] bg-repeat relative"
      >
        <div
          class="absolute inset-0 bg-gradient-to-b from-teal-50 to-green-50 bg-opacity-95"
        ></div>
        <div class="container mx-auto px-4 text-center relative">
          <div
            class="bg-white bg-opacity-90 p-12 rounded-3xl shadow-lg max-w-3xl mx-auto"
          >
            <h2 class="text-4xl font-bold mb-6 text-gray-800">
              Start building with ForgeBase
            </h2>
            <p class="text-xl text-gray-600 mb-10">
              Set up your backend in minutes and focus on building your product
              instead of infrastructure
            </p>
            <div class="flex flex-col sm:flex-row justify-center gap-4">
              <p-button
                label="Start your project"
                styleClass="p-button-lg bg-teal-500 hover:bg-teal-600 border-none text-white rounded-full"
              />
              <p-button
                label="Schedule a demo"
                styleClass="p-button-lg p-button-outlined border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer with more rounded elements -->
      <footer
        class="bg-[url('/api/placeholder/1200/200')] bg-cover bg-center relative py-16"
      >
        <div class="absolute inset-0 bg-white bg-opacity-90"></div>
        <div class="container mx-auto px-4 relative">
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <div class="col-span-2 md:col-span-1">
              <div
                class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-green-400 mb-4"
              >
                ForgeBase
              </div>
              <p class="text-gray-600">The cloud-native backend solution</p>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-4 text-gray-800">Product</h4>
              <ul class="space-y-2">
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Database</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Authentication</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Storage</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Functions</a
                  >
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-4 text-gray-800">
                Resources
              </h4>
              <ul class="space-y-2">
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Documentation</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Guides</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600">Blog</a>
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Support</a
                  >
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-4 text-gray-800">Company</h4>
              <ul class="space-y-2">
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >About</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Careers</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Pricing</a
                  >
                </li>
                <li>
                  <a href="#" class="text-gray-600 hover:text-teal-600"
                    >Contact</a
                  >
                </li>
              </ul>
            </div>
          </div>
          <div
            class="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center"
          >
            <div class="text-gray-600 mb-4 md:mb-0">
              © 2025 ForgeBase, Inc. All rights reserved.
            </div>
            <div class="flex space-x-6">
              <a
                href="#"
                class="text-gray-600 hover:text-teal-600 rounded-full bg-gray-100 hover:bg-gray-200 p-2 w-10 h-10 flex items-center justify-center transition-colors"
                >T</a
              >
              <a
                href="#"
                class="text-gray-600 hover:text-teal-600 rounded-full bg-gray-100 hover:bg-gray-200 p-2 w-10 h-10 flex items-center justify-center transition-colors"
                >G</a
              >
              <a
                href="#"
                class="text-gray-600 hover:text-teal-600 rounded-full bg-gray-100 hover:bg-gray-200 p-2 w-10 h-10 flex items-center justify-center transition-colors"
                >D</a
              >
              <a
                href="#"
                class="text-gray-600 hover:text-teal-600 rounded-full bg-gray-100 hover:bg-gray-200 p-2 w-10 h-10 flex items-center justify-center transition-colors"
                >Y</a
              >
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export default class HomeComponent {}
