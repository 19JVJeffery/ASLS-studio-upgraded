/**
 * HTTP Remote Control routes
 *
 * Enables external devices (phones, Stream Deck, etc.) to control the show
 * without running the full frontend.
 *
 * Routes
 *  POST /remote/go              – advance to next cue (broadcasts via WS)
 *  POST /remote/back            – step back (broadcasts via WS)
 *  POST /remote/cue/:groupId/:cueId/go    – trigger a specific cue
 *  POST /remote/cue/:groupId/:cueId/stop  – stop a specific cue
 *  POST /remote/chase/:groupId/:chaseId/go   – trigger a chase
 *  POST /remote/chase/:groupId/:chaseId/stop – stop a chase
 *  GET  /remote/status          – return server status JSON
 */

import { EventEmitter } from 'events';
import { Router } from 'express';

const router = Router();

// Router doubles as an event emitter so server/index.js can forward events
// to browser clients as WebSocket messages.
Object.assign(router, EventEmitter.prototype);
EventEmitter.call(router);

function broadcast(event, payload = {}) {
  router.emit('broadcast', { type: `remote:${event}`, ...payload });
}

// ---------------------------------------------------------------------------
// POST /remote/go
// ---------------------------------------------------------------------------
router.post('/go', (req, res) => {
  broadcast('go');
  res.json({ ok: true, action: 'go' });
});

// ---------------------------------------------------------------------------
// POST /remote/back
// ---------------------------------------------------------------------------
router.post('/back', (req, res) => {
  broadcast('back');
  res.json({ ok: true, action: 'back' });
});

// ---------------------------------------------------------------------------
// POST /remote/cue/:groupId/:cueId/go
// ---------------------------------------------------------------------------
router.post('/cue/:groupId/:cueId/go', (req, res) => {
  const { groupId, cueId } = req.params;
  broadcast('cue:go', { groupId: Number(groupId), cueId: Number(cueId) });
  res.json({ ok: true, action: 'cue:go', groupId, cueId });
});

// ---------------------------------------------------------------------------
// POST /remote/cue/:groupId/:cueId/stop
// ---------------------------------------------------------------------------
router.post('/cue/:groupId/:cueId/stop', (req, res) => {
  const { groupId, cueId } = req.params;
  broadcast('cue:stop', { groupId: Number(groupId), cueId: Number(cueId) });
  res.json({ ok: true, action: 'cue:stop', groupId, cueId });
});

// ---------------------------------------------------------------------------
// POST /remote/chase/:groupId/:chaseId/go
// ---------------------------------------------------------------------------
router.post('/chase/:groupId/:chaseId/go', (req, res) => {
  const { groupId, chaseId } = req.params;
  broadcast('chase:go', { groupId: Number(groupId), chaseId: Number(chaseId) });
  res.json({ ok: true, action: 'chase:go', groupId, chaseId });
});

// ---------------------------------------------------------------------------
// POST /remote/chase/:groupId/:chaseId/stop
// ---------------------------------------------------------------------------
router.post('/chase/:groupId/:chaseId/stop', (req, res) => {
  const { groupId, chaseId } = req.params;
  broadcast('chase:stop', { groupId: Number(groupId), chaseId: Number(chaseId) });
  res.json({ ok: true, action: 'chase:stop', groupId, chaseId });
});

// ---------------------------------------------------------------------------
// GET /remote/status
// ---------------------------------------------------------------------------
router.get('/status', (req, res) => {
  res.json({
    server: 'ASLS Studio',
    uptime: process.uptime(),
    time: new Date().toISOString(),
  });
});

export default router;
