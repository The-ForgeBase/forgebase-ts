import { createServer } from 'http';
import { createForgeDatabase } from '../src';
import { SSEManager } from '../src/websocket';
import { knex } from 'knex';

// Example of integrating the SSEManager with an HTTP server

// Initialize the database
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: ':memory:',
  },
  useNullAsDefault: true,
});

// Create the ForgeDatabase instance with SSE adapter
const forgeDb = createForgeDatabase({
  db,
  realtime: true,
  realtimeAdapter: 'sse',
  websocketPort: 9001,
});

// Get the SSEManager instance
// Note: In a real application, you would need to cast the realtimeAdapter to SSEManager
// This is just for demonstration purposes
const sseManager = forgeDb.realtimeAdapter as SSEManager;

// Create an HTTP server to handle SSE requests
const server = createServer(async (req, res) => {
  // Convert the Node.js request to a Fetch API Request
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value)
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  });

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
  });

  try {
    // Use the SSEManager to handle the request
    const response = await sseManager.handleRequest(request);

    // Convert the Fetch API Response to a Node.js response
    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Stream the response body
    if (response.body) {
      const reader = response.body.getReader();

      // Process the stream
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };

      processStream().catch((error) => {
        console.error('Error processing stream:', error);
        res.end();
      });
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Error handling request:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Start the server
server.listen(9001, () => {
  console.log('SSE server listening on port 9001');
});

// Example of broadcasting a message to all subscribers of a table
async function broadcastExample() {
  // Create a table
  await db.schema.createTable('posts', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('content');
    table.integer('author_id').notNullable();
  });

  // Insert a record
  const [postId] = await db('posts').insert({
    title: 'Hello World',
    content: 'This is my first post',
    author_id: 1,
  });

  // Broadcast the new post to all subscribers
  await sseManager.broadcast('posts', 'create', {
    id: postId,
    title: 'Hello World',
    content: 'This is my first post',
    author_id: 1,
  });

  console.log('Broadcast sent for new post');
}

// Run the example
broadcastExample().catch(console.error);

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
