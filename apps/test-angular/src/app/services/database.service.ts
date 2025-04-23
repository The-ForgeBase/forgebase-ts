import { Injectable } from '@angular/core';
import { DatabaseSDK } from '@forgebase-ts/sdk/database/client'; // Assuming path mapping is configured

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  // The instance of the DatabaseSDK, configured and ready to use.
  public readonly sdk: DatabaseSDK;

  constructor() {
    // TODO: Replace with actual configuration (e.g., from environment variables)
    const baseUrl = 'http://localhost:3000/api/db'; // Placeholder URL

    // Instantiate the SDK
    // If authentication is needed, you might need to pass an axios instance
    // configured with interceptors from an authentication service.
    this.sdk = new DatabaseSDK({ baseUrl });

    console.log('DatabaseService initialized');
  }

  // Optional: Add methods here to interact with the SDK if needed,
  // or components can directly use the public 'sdk' instance.
}
