'use strict';

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const rateLimit = require('express-rate-limit');

const taskRoutes = require('./routes/tasks');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const copilotWorker = require('./services/copilotWorker');

const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();

// Apply a generous rate limit to all routes (protects both API and static serving).
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// REST routes
app.use('/api/tasks', taskRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve the frontend in production
if (IS_PRODUCTION) {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Create HTTP server and attach WebSocket server
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, req) => {
  console.log(`[WebSocket] Client connected from ${req.socket.remoteAddress}`);
  socket.on('close', () => console.log('[WebSocket] Client disconnected.'));
  socket.on('error', (err) => console.error('[WebSocket] Socket error:', err.message));
});

// Start the Copilot background worker
copilotWorker.start(wss);

// Start listening
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`[Server] Mode: ${IS_PRODUCTION ? 'production' : 'development'}`);
});

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  await copilotWorker.stop();
  wss.close(() => {
    server.close(() => {
      console.log('[Server] Closed.');
      process.exit(0);
    });
  });
  // Force exit after 10 s if clean shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
