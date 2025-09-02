const http = require('http');
const fs = require('fs');
const path = require('path');

// Import the built application
const app = require('./dist/_worker.js');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  try {
    // Create a Hono-compatible request object
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Handle the request with Hono
    const honoRequest = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined
    });
    
    const honoResponse = await app.default.fetch(honoRequest);
    
    // Send the response
    res.statusCode = honoResponse.status;
    
    // Set headers
    for (const [key, value] of honoResponse.headers) {
      res.setHeader(key, value);
    }
    
    // Send body
    const body = await honoResponse.text();
    res.end(body);
    
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AUTHORR AI - Starting Up</title>
          <style>
            body { 
              font-family: system-ui; 
              background: #1a1a1a; 
              color: white; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              text-align: center;
            }
            .loading {
              background: linear-gradient(45deg, #78e3fe, #5dd8fc);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              font-size: 2em;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div>
            <h1 class="loading">AUTHORR AI</h1>
            <p>System initializing... Please refresh in a moment.</p>
            <p><strong>Your complete original site is being restored.</strong></p>
          </div>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AUTHORR AI Server running on port ${PORT}`);
  console.log(`📱 Access your site at: http://0.0.0.0:${PORT}`);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('🛑 Server shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});