/**
 * Output management routes
 *
 * The backend manages a pool of hardware output drivers.
 * The browser POSTs universe data via WebSocket (see server/index.js),
 * and this module lets the browser configure which hardware drivers are active.
 *
 * Routes
 *  GET  /api/outputs            – list configured output sessions
 *  POST /api/outputs            – create an output session { type, universe, ... config }
 *  DELETE /api/outputs/:id      – remove an output session
 *  POST /api/outputs/:id/connect    – connect/start an output
 *  POST /api/outputs/:id/disconnect – disconnect/stop an output
 */

import { Router } from 'express';
import DriverManager from '../services/driver-manager.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/outputs
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  res.json(DriverManager.list());
});

// ---------------------------------------------------------------------------
// POST /api/outputs  { type, universe, name, ...driverConfig }
//  type: 'artnet' | 'sacn' | 'virtual'
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const session = DriverManager.create(req.body);
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/outputs/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    DriverManager.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/outputs/:id/connect
// ---------------------------------------------------------------------------
router.post('/:id/connect', (req, res) => {
  try {
    DriverManager.connect(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/outputs/:id/disconnect
// ---------------------------------------------------------------------------
router.post('/:id/disconnect', (req, res) => {
  try {
    DriverManager.disconnect(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
