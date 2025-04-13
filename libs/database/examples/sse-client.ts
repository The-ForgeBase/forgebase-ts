import { DatabaseSDK } from '@forgebase-ts/sdk/client';
import { WebsocketSSE } from 'crossws/websocket/sse';

// Example of using the SSE adapter with the DatabaseSDK

// Initialize the DatabaseSDK
const db = new DatabaseSDK('http://localhost:3000', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'user-context': JSON.stringify({ userId: 1, role: 'user' }),
  },
});

// Initialize the SSE client
const sseClient = new WebsocketSSE('http://localhost:9001', { bidir: true });

// Set up event listeners
sseClient.addEventListener('open', () => {
  console.log('Connected to SSE server');
  
  // Subscribe to a table
  // Send the user context with the subscription request
  sseClient.send(JSON.stringify({
    type: 'subscribe',
    tableName: 'posts',
    userContext: { userId: 1, role: 'user' }
  }));
});

sseClient.addEventListener('message', (event) => {
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
      console.log(`Successfully unsubscribed from table: ${data.tableName}`);
    } else if (data.event) {
      // Handle table events (create, update, delete)
      console.log(`Received ${data.event} event for table ${data.tableName}:`, data.data);
      
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

sseClient.addEventListener('error', (error) => {
  console.error('SSE connection error:', error);
});

sseClient.addEventListener('close', () => {
  console.log('SSE connection closed');
});

// Example of unsubscribing from a table
function unsubscribeFromTable(tableName: string) {
  sseClient.send(JSON.stringify({
    type: 'unsubscribe',
    tableName,
  }));
}

// Example of closing the connection
function closeConnection() {
  sseClient.close();
}

// Example of using the DatabaseSDK with SSE for real-time updates
async function main() {
  try {
    // Fetch initial data
    const posts = await db
      .table('posts')
      .select('id', 'title', 'content', 'author_id')
      .where('author_id', 1)
      .execute();
    
    console.log('Initial posts:', posts);
    
    // Create a new post - this will trigger a real-time update via SSE
    const newPost = await db.table('posts').create({
      title: 'New Post',
      content: 'This is a new post that will trigger a real-time update',
      author_id: 1,
    });
    
    console.log('Created new post:', newPost);
    
    // Update a post - this will trigger a real-time update via SSE
    await db.table('posts').update(newPost.id, {
      title: 'Updated Post Title',
    });
    
    // Clean up
    setTimeout(() => {
      unsubscribeFromTable('posts');
      closeConnection();
    }, 60000); // Close after 1 minute
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main();
