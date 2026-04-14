/**
 * ASLS Studio – Local Backend Server
 *
 * Responsibilities:
 *  - Serve the Vite production build (or dev-proxy in dev mode)
 *  - REST API: /api/shows, /api/fixtures, /api/outputs
 *  - WebSocket server: receives 512-byte DMX universe buffers from the browser
 *    and fans them out to active hardware drivers (Art-Net, sACN, …)
 *  - WebSocket server: OSC gateway and remote-control endpoint
 *  - Auto-save: persists the active show to disk every 60 s
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import showsRouter from './routes/shows.js';
import fixturesRouter from './routes/fixtures.js';
import outputsRouter from './routes/outputs.js';
import remoteRouter from './routes/remote.js';
import OscService from './services/osc.js';
import AutoSave from './services/autosave.js';
import DriverManager from './services/driver-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const OSC_PORT = parseInt(process.env.OSC_PORT || '8000', 10);

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static Vite build from /dist
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Serve public assets (fixtures, demos, etc.) directly
const publicPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicPath));

// REST API routes
app.use('/api/shows', showsRouter);
app.use('/api/fixtures', fixturesRouter);
app.use('/api/outputs', outputsRouter);
app.use('/remote', remoteRouter);

// SPA fallback – any unknown GET goes to index.html
app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      res.status(404).send('Build not found. Run `npm run build` first or use `npm start` for dev mode.');
    }
  });
});

// ---------------------------------------------------------------------------
// HTTP + WebSocket server
// ---------------------------------------------------------------------------
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

/** Map of universeId -> connected browser WebSocket clients (for virtual output) */
const virtualClients = new Set();

wss.on('connection', (ws) => {
  virtualClients.add(ws);

  ws.on('message', (data) => {
    try {
      // Expect messages like: { type: 'dmx', universe: 0, data: [...512 bytes] }
      const msg = JSON.parse(data.toString());
      if (msg.type === 'dmx' && Array.isArray(msg.data)) {
        const universe = msg.universe ?? 0;
        const buf = Buffer.from(msg.data);
        DriverManager.send(universe, buf);
      } else if (msg.type === 'show:save') {
        // Browser sends the full show JSON to persist on disk
        AutoSave.save(msg.name, msg.data);
      } else if (msg.type === 'cue:go') {
        remoteRouter.emit('go');
      } else if (msg.type === 'cue:back') {
        remoteRouter.emit('back');
      }
    } catch (_) { /* ignore malformed frames */ }
  });

  ws.on('close', () => virtualClients.delete(ws));
});

// Expose virtual clients so the virtual driver can reach them
export { virtualClients };

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
OscService.start(OSC_PORT, (address, args) => {
  // Broadcast incoming OSC message to all browser clients as JSON
  const payload = JSON.stringify({ type: 'osc', address, args });
  virtualClients.forEach((ws) => {
    if (ws.readyState === 1 /* OPEN */) ws.send(payload);
  });
});

AutoSave.init();

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`\nASLS Studio server running at http://localhost:${PORT}`);
  console.log(`  REST API : http://localhost:${PORT}/api`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  OSC input: udp://localhost:${OSC_PORT}\n`);
});

export default app;
