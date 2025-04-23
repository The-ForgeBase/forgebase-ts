import { Component, inject, OnInit, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { WebSocketSSE } from 'crossws/websocket/sse';

@Component({
  selector: 'app-database',
  imports: [CommonModule],
  templateUrl: './database.component.html',
  styleUrl: './database.component.css',
})
export class DatabaseComponent implements OnInit {
  dbSdk = inject(DatabaseService);
  sseClient = new WebSocketSSE('http://localhost:3000/api/sse', {
    bidir: true,
    stream: false, // This setting avoids ReadableStream issues on the server
  });

  posts = resource({
    loader: async ({ request }) => {
      const res = await this.dbSdk.sdk.table('posts').execute();

      if (res.error) {
        return [];
      }

      console.log(res);

      return res.records;
    },
    defaultValue: [],
  });

  ngOnInit(): void {
    console.log('DatabaseComponent initialized');

    this.sseClient.addEventListener('open', async () => {
      console.log('Connected to SSE server');

      // Subscribe to a table
      // Send the user context with the subscription request
      await this.sseClient.send(
        JSON.stringify({
          type: 'subscribe',
          tableName: 'posts',
        })
      );

      console.log('Sent subscription request');
    });

    this.sseClient.addEventListener('error', (error) => {
      console.error('SSE connection error:', error);
    });

    this.sseClient.addEventListener('close', () => {
      console.log('SSE connection closed');
    });

    this.sseClient.addEventListener('message', (event: any) => {
      console.log('Received message:', event);
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        if (data.type === 'welcome') {
          console.log('Received welcome message:', data.message);
        } else if (data.type === 'error') {
          console.error('Received error:', data.message);
        } else if (data.type === 'subscribed') {
          console.log(`Successfully subscribed to table: ${data.tableName}`);
        } else if (data.type === 'unsubscribed') {
          console.log(
            `Successfully unsubscribed from table: ${data.tableName}`
          );
        } else if (data.event) {
          // Handle table events (create, update, delete)
          console.log(
            `Received ${data.event} event for table ${data.tableName}:`,
            data.data
          );

          // Update your UI or state based on the event
          if (data.event === 'create') {
            // Handle new record
            console.log('New record created:', data.data);
          } else if (data.event === 'update') {
            // Handle updated record
            console.log('Record updated:', data.data);
          } else if (data.event === 'delete') {
            // Handle deleted record
            console.log('Record deleted:', data.data);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
  }
}
