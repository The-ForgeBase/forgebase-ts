import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nx-welcome',
  standalone: true, // Mark component as standalone
  imports: [CommonModule],
  template: `
    <style>
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
          'Segoe UI Symbol';
        padding: 2rem;
        background-color: #f9fafb; /* Light gray background */
        min-height: 100vh;
        box-sizing: border-box;
      }

      .container {
        max-width: 800px;
        margin: 2rem auto;
        background-color: #ffffff; /* White card */
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        text-align: center;
      }

      h1 {
        color: #111827; /* Dark gray heading */
        font-size: 2.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }

      p {
        color: #4b5563; /* Medium gray text */
        font-size: 1.125rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }

      .libs-list {
        list-style: none;
        padding: 0;
        margin-top: 2rem;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
      }

      .libs-list li {
        background-color: #e5e7eb; /* Lighter gray chip */
        color: #374151; /* Darker gray chip text */
        padding: 0.5rem 1rem;
        border-radius: 16px;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .logo {
        height: 60px;
        margin-bottom: 1.5rem;
      }
    </style>

    <div class="container">
      <!-- Optional: Add a logo if available -->
      <!-- <img src="/path/to/your/logo.svg" alt="Forgebase Logo" class="logo"> -->
      <h1>Welcome to the Forgebase Test App!</h1>
      <p>
        This Angular application serves as a dedicated testing environment for
        the various libraries within the <strong>Forgebase</strong> monorepo.
      </p>
      <p>Here, we integrate and test the functionality of libraries such as:</p>
      <ul class="libs-list">
        <li>api</li>
        <li>auth</li>
        <li>common</li>
        <li>database</li>
        <li>react-native-auth</li>
        <li>real-time</li>
        <li>sdk</li>
        <li>storage</li>
        <li>studio-ui</li>
        <li>web-auth</li>
        <!-- Add more libraries as needed -->
      </ul>
    </div>
  `,
  encapsulation: ViewEncapsulation.None, // Use None or ShadowDom for styles to apply correctly
})
export class NxWelcomeComponent {}
