// Yjs WebSocket server for real-time collaboration
const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const port = process.env.PORT || 3001;
const host = process.env.HOST || 'localhost';

const wss = new WebSocket.Server({ 
  port,
  host,
  perMessageDeflate: false 
});

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection from:', req.socket.remoteAddress);
  setupWSConnection(ws, req);
});

console.log(`Yjs WebSocket server running on ws://${host}:${port}`);
console.log('Ready for collaborative editing connections...');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Yjs WebSocket server...');
  wss.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Yjs WebSocket server...');
  wss.close(() => {
    process.exit(0);
  });
});
