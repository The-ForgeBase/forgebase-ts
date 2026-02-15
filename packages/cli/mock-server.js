import http from 'http';

const mockSchema = {
  users: {
    columns: [
      { name: 'id', dataType: 'serial', isNullable: false },
      { name: 'email', dataType: 'varchar', isNullable: false },
      { name: 'age', dataType: 'integer', isNullable: true },
      { name: 'is_active', dataType: 'boolean', isNullable: false },
      { name: 'metadata', dataType: 'jsonb', isNullable: true },
      { name: 'created_at', dataType: 'timestamptz', isNullable: false },
    ],
  },
  posts: {
    columns: [
      { name: 'id', dataType: 'bigserial', isNullable: false },
      { name: 'title', dataType: 'text', isNullable: false },
      { name: 'content', dataType: 'text', isNullable: true },
      { name: 'author_id', dataType: 'integer', isNullable: false },
    ],
  },
};

const server = http.createServer((req, res) => {
  if (req.url === '/schema') {
    // Simulate network latency (3 seconds)
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockSchema));
    }, 3000);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3001, () => {
  console.log('Mock schema server running at http://localhost:3001/schema');
});
