import express from 'express';
import { createForgeDatabase } from '../src';
import { SSEManager } from '../src/websocket';
import { Knex, knex } from 'knex';

// Example of integrating the SSEManager with Express

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

// Create an Express app
const app = express();

// Add middleware for parsing JSON
app.use(express.json());

// Add middleware for handling SSE requests
app.use(async (req, res, next) => {
  // Check if this is an SSE request
  if (
    req.headers.accept === 'text/event-stream' ||
    req.headers['x-crossws-id']
  ) {
    try {
      // Convert Express request to Fetch API Request
      const url = new URL(req.url, `http://${req.headers.host}`);

      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value)
          headers.set(
            key,
            Array.isArray(value) ? value.join(', ') : value.toString()
          );
      });

      const request = new Request(url.toString(), {
        method: req.method,
        headers,
      });

      // Use the SSEManager to handle the request
      const response = await sseManager.handleRequest(request);

      // Convert the Fetch API Response to an Express response
      res.status(response.status);

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
      console.error('Error handling SSE request:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    // Not an SSE request, continue to the next middleware
    next();
  }
});

// Add a route for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SSE Test</title>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const output = document.getElementById('output');
          const sseClient = new EventSource('/sse');
          
          sseClient.onopen = () => {
            output.innerHTML += '<p>Connected to SSE server</p>';
            
            // Subscribe to the posts table
            const message = {
              type: 'subscribe',
              tableName: 'posts',
              userContext: { userId: 1, role: 'user' }
            };
            
            // For bidirectional communication, we need to use fetch
            fetch('/sse', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-crossws-id': 'client-1'
              },
              body: JSON.stringify(message)
            });
          };
          
          sseClient.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              output.innerHTML += '<p>Received: ' + JSON.stringify(data) + '</p>';
            } catch (error) {
              output.innerHTML += '<p>Received: ' + event.data + '</p>';
            }
          };
          
          sseClient.onerror = (error) => {
            output.innerHTML += '<p>Error: ' + error + '</p>';
          };
          
          // Create a new post button
          document.getElementById('create-post').addEventListener('click', async () => {
            try {
              const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  title: 'New Post',
                  content: 'This is a new post',
                  author_id: 1
                })
              });
              
              const data = await response.json();
              output.innerHTML += '<p>Created post: ' + JSON.stringify(data) + '</p>';
            } catch (error) {
              output.innerHTML += '<p>Error creating post: ' + error + '</p>';
            }
          });
        });
      </script>
    </head>
    <body>
      <h1>SSE Test</h1>
      <button id="create-post">Create Post</button>
      <div id="output"></div>
    </body>
    </html>
  `);
});

// Add a route for creating posts
app.post('/api/posts', async (req, res) => {
  try {
    // Create a post
    const [postId] = await db('posts').insert({
      title: req.body.title,
      content: req.body.content,
      author_id: req.body.author_id,
    });

    // Get the created post
    const post = await db('posts').where('id', postId).first();

    // Broadcast the new post to all subscribers
    await sseManager.broadcast('posts', 'create', post);

    res.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a route for SSE
app.all('/sse', (req, res) => {
  // This route is handled by the SSE middleware
});

// Start the server
const PORT = process.env.PORT || 9001;
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  // Create the posts table
  try {
    // Check if the table exists
    const exists = await db.schema.hasTable('posts');
    if (!exists) {
      await db.schema.createTable('posts', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.text('content');
        table.integer('author_id').notNullable();
        table.timestamps(true, true);
      });
      console.log('Created posts table');
    }
  } catch (error) {
    console.error('Error creating posts table:', error);
  }
});
