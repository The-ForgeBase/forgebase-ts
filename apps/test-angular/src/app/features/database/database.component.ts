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
  dbSdk = inject(DatabaseService).sdk;
  sseClient = new WebSocketSSE('http://localhost:3000/api/sse', {
    bidir: true,
    stream: false, // This setting avoids ReadableStream issues on the server
  });

  posts = resource({
    loader: async ({ request }) => {
      const res = await this.dbSdk.table('posts').execute();

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
            console.log('New record created:', data.data[0].data);
            // Add the new record to the posts array
            this.posts.update((posts) => [...posts!, ...data.data[0].data]);
          } else if (data.event === 'update') {
            // Handle updated record
            console.log('Record updated:', data.data[0].data);

            const updatedPost: any[] = data.data[0].data;

            // Loop through the updatedPost array
            for (const post of updatedPost) {
              // Find the index of the post in the posts array
              const index = this.posts
                .value()!
                .findIndex((p: any) => p.id === post.id);
              // If the post is found, update it
              if (index !== -1) {
                this.posts.update((posts) => {
                  const updatedPosts = [...posts!];
                  updatedPosts[index] = post;
                  return updatedPosts;
                });
              }
            }
          } else if (data.event === 'delete') {
            // Handle deleted record
            console.log('Record deleted:', data.data);

            const deletedPostId = Number(data.data[0].data.id);

            console.log('Deleted post ID:', deletedPostId);

            // Filter out the deleted post from the posts array
            this.posts.update((posts) =>
              posts!.filter((post) => post['id'] !== deletedPostId)
            );
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // simulate a new post at 10 second intervals
    // setInterval(async () => {
    //   const randomWords = {
    //     titles: [
    //       'Spectacular',
    //       'Mysterious',
    //       'Enchanting',
    //       'Peculiar',
    //       'Whimsical',
    //     ],
    //     contents: ['Adventure', 'Discovery', 'Journey', 'Mystery', 'Wonder'],
    //   };

    //   const randomTitle =
    //     randomWords.titles[
    //       Math.floor(Math.random() * randomWords.titles.length)
    //     ];
    //   const randomContent =
    //     randomWords.contents[
    //       Math.floor(Math.random() * randomWords.contents.length)
    //     ];

    //   await this.dbSdk.sdk.table('posts').create({
    //     title: randomTitle,
    //     content: randomContent,
    //     author_id: 1,
    //   });
    // }, 10000);
  }

  // Simulate creating a new post
  async simulateCreate() {
    // Use random data for demonstration
    const randomTitles = [
      'Spectacular',
      'Mysterious',
      'Enchanting',
      'Peculiar',
      'Whimsical',
    ];
    const randomContents = [
      'Adventure',
      'Discovery',
      'Journey',
      'Mystery',
      'Wonder',
    ];
    const randomTitle =
      randomTitles[Math.floor(Math.random() * randomTitles.length)];
    const randomContent =
      randomContents[Math.floor(Math.random() * randomContents.length)];
    try {
      const res = await this.dbSdk.table('posts').create({
        title: randomTitle,
        content: randomContent,
        author_id: 1,
      });
      console.log('Simulated create:', res);
    } catch (error) {
      console.error('Simulate create failed:', error);
    }
  }

  // Simulate updating the first post
  async simulateUpdate() {
    try {
      const posts = this.posts.value();
      if (!posts || posts.length === 0) {
        console.warn('No posts to update');
        return;
      }
      const postsLength = posts.length;
      const randomIndex = Math.floor(Math.random() * postsLength);
      const post = posts[randomIndex];
      const updatedTitle = post['title'] + ' (Updated)';
      const res = await this.dbSdk.table('posts').update(post['id'], {
        title: updatedTitle,
      });
      console.log('Simulated update:', res);
    } catch (error) {
      console.error('Simulate update failed:', error);
    }
  }

  // Simulate deleting the first post
  async simulateDelete() {
    try {
      const posts = this.posts.value();
      if (!posts || posts.length === 0) {
        console.warn('No posts to delete');
        return;
      }
      const post = posts[0];
      const res = await this.dbSdk.table('posts').delete(post['id']);
      console.log('Simulated delete:', res, post['id']);
    } catch (error) {
      console.error('Simulate delete failed:', error);
    }
  }
}
