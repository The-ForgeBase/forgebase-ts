import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { SSEService } from './sse.service';

@Controller('sse-test')
export class SSETestController {
  constructor(private readonly sseService: SSEService) {}

  @Get()
  getTestPage(@Res() res: Response): void {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SSE Test</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          #output {
            border: 1px solid #ccc;
            padding: 10px;
            height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
            background-color: #f9f9f9;
          }
          button {
            padding: 8px 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            cursor: pointer;
            margin-right: 10px;
          }
          button:hover {
            background-color: #45a049;
          }
          input {
            padding: 8px;
            width: 300px;
          }
        </style>
      </head>
      <body>
        <h1>SSE Test Page</h1>
        <p>This page demonstrates Server-Sent Events (SSE) functionality.</p>
        
        <div>
          <button id="connect-btn">Connect to SSE</button>
          <button id="disconnect-btn" disabled>Disconnect</button>
        </div>
        
        <h2>Subscribe to a Table</h2>
        <div>
          <input type="text" id="table-name" placeholder="Enter table name" value="posts">
          <button id="subscribe-btn" disabled>Subscribe</button>
          <button id="unsubscribe-btn" disabled>Unsubscribe</button>
        </div>
        
        <h2>Create a Test Record</h2>
        <div>
          <input type="text" id="post-title" placeholder="Enter post title" value="Test Post">
          <button id="create-post-btn">Create Post</button>
        </div>
        
        <h2>Events</h2>
        <div id="output"></div>
        
        <script>
          const output = document.getElementById('output');
          const connectBtn = document.getElementById('connect-btn');
          const disconnectBtn = document.getElementById('disconnect-btn');
          const subscribeBtn = document.getElementById('subscribe-btn');
          const unsubscribeBtn = document.getElementById('unsubscribe-btn');
          const tableNameInput = document.getElementById('table-name');
          const postTitleInput = document.getElementById('post-title');
          const createPostBtn = document.getElementById('create-post-btn');
          
          let sseClient = null;
          let currentTable = null;
          
          function log(message) {
            const now = new Date().toISOString();
            output.innerHTML += \`<div>\${now}: \${message}</div>\`;
            output.scrollTop = output.scrollHeight;
          }
          
          connectBtn.addEventListener('click', () => {
            // Initialize the SSE client
            sseClient = new EventSource('/api/sse');
            
            sseClient.onopen = () => {
              log('Connected to SSE server');
              connectBtn.disabled = true;
              disconnectBtn.disabled = false;
              subscribeBtn.disabled = false;
            };
            
            sseClient.addEventListener('message', (event) => {
              try {
                const data = JSON.parse(event.data);
                log(\`Received: \${JSON.stringify(data)}\`);
              } catch (error) {
                log(\`Received: \${event.data}\`);
              }
            });
            
            sseClient.onerror = (error) => {
              log(\`Error: \${error}\`);
            };
          });
          
          disconnectBtn.addEventListener('click', () => {
            if (sseClient) {
              sseClient.close();
              sseClient = null;
              log('Disconnected from SSE server');
              connectBtn.disabled = false;
              disconnectBtn.disabled = true;
              subscribeBtn.disabled = true;
              unsubscribeBtn.disabled = true;
              currentTable = null;
            }
          });
          
          subscribeBtn.addEventListener('click', async () => {
            if (!sseClient) {
              log('Not connected to SSE server');
              return;
            }
            
            const tableName = tableNameInput.value.trim();
            if (!tableName) {
              log('Please enter a table name');
              return;
            }
            
            try {
              // For bidirectional communication, we need to use fetch
              const response = await fetch('/api/sse', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CrossWS-ID': 'client-1',
                  'User-Context': JSON.stringify({ userId: 1, role: 'user' })
                },
                body: JSON.stringify({
                  type: 'subscribe',
                  tableName
                })
              });
              
              log(\`Subscribed to table: \${tableName}\`);
              currentTable = tableName;
              subscribeBtn.disabled = true;
              unsubscribeBtn.disabled = false;
            } catch (error) {
              log(\`Error subscribing to table: \${error}\`);
            }
          });
          
          unsubscribeBtn.addEventListener('click', async () => {
            if (!sseClient || !currentTable) {
              log('Not subscribed to any table');
              return;
            }
            
            try {
              // For bidirectional communication, we need to use fetch
              const response = await fetch('/api/sse', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CrossWS-ID': 'client-1'
                },
                body: JSON.stringify({
                  type: 'unsubscribe',
                  tableName: currentTable
                })
              });
              
              log(\`Unsubscribed from table: \${currentTable}\`);
              currentTable = null;
              subscribeBtn.disabled = false;
              unsubscribeBtn.disabled = true;
            } catch (error) {
              log(\`Error unsubscribing from table: \${error}\`);
            }
          });
          
          createPostBtn.addEventListener('click', async () => {
            const title = postTitleInput.value.trim();
            if (!title) {
              log('Please enter a post title');
              return;
            }
            
            try {
              const response = await fetch('/api/db/posts', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  data: {
                    title,
                    content: 'This is a test post created from the SSE test page',
                    author_id: 1
                  }
                })
              });
              
              const data = await response.json();
              log(\`Created post: \${JSON.stringify(data)}\`);
            } catch (error) {
              log(\`Error creating post: \${error}\`);
            }
          });
        </script>
      </body>
      </html>
    `);
  }

  @Post('broadcast')
  async broadcastMessage(@Body() body: { tableName: string; event: string; data: any }) {
    const { tableName, event, data } = body;
    await this.sseService.broadcast(tableName, event, data);
    return { success: true, message: 'Broadcast sent' };
  }
}
