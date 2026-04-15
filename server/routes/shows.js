/**
 * Show persistence routes
 *
 * Shows are stored as JSON files in ~/.asls-studio/shows/
 *
 * Routes
 *  GET  /api/shows           – list all saved shows
 *  GET  /api/shows/current   – return the most recently saved show
 *  GET  /api/shows/:name     – return a specific show by file name
 *  POST /api/shows           – save or overwrite a show  (body: { name, data })
 *  DELETE /api/shows/:name   – delete a show
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

const SHOWS_DIR = path.join(os.homedir(), '.asls-studio', 'shows');
const CURRENT_POINTER = path.join(os.homedir(), '.asls-studio', 'current.json');

// Ensure shows directory exists
if (!fs.existsSync(SHOWS_DIR)) {
  fs.mkdirSync(SHOWS_DIR, { recursive: true });
}

/**
 * Sanitise a file name so it only contains safe characters.
 */
function sanitizeName(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9_\-. ]/g, '_');
}

function showPath(name) {
  const safe = sanitizeName(name).replace(/\.json$/, '') + '.json';
  return path.join(SHOWS_DIR, safe);
}

// ---------------------------------------------------------------------------
// GET /api/shows
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(SHOWS_DIR).filter((f) => f.endsWith('.json'));
    const shows = files.map((f) => {
      const stat = fs.statSync(path.join(SHOWS_DIR, f));
      return {
        name: f.replace('.json', ''),
        filename: f,
        modified: stat.mtime,
        size: stat.size,
      };
    }).sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json(shows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shows/current
// ---------------------------------------------------------------------------
router.get('/current', (req, res) => {
  try {
    if (!fs.existsSync(CURRENT_POINTER)) {
      return res.status(404).json({ error: 'No current show' });
    }
    const { name } = JSON.parse(fs.readFileSync(CURRENT_POINTER, 'utf8'));
    const fp = showPath(name);
    if (!fp.startsWith(SHOWS_DIR)) {
      return res.status(400).json({ error: 'Invalid show name' });
    }
    if (!fs.existsSync(fp)) {
      return res.status(404).json({ error: 'Current show file missing' });
    }
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    res.json({ name, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shows/:name
// ---------------------------------------------------------------------------
router.get('/:name', (req, res) => {
  try {
    const fp = showPath(req.params.name);
    if (!fp.startsWith(SHOWS_DIR)) {
      return res.status(400).json({ error: 'Invalid show name' });
    }
    if (!fs.existsSync(fp)) {
      return res.status(404).json({ error: 'Show not found' });
    }
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    res.json({ name: req.params.name, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/shows  { name: string, data: object }
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: 'name and data are required' });
    }
    const fp = showPath(name);
    if (!fp.startsWith(SHOWS_DIR)) {
      return res.status(400).json({ error: 'Invalid show name' });
    }
    // Stamp version for migration
    data._version = data._version || 1;
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
    // Update current pointer
    fs.writeFileSync(CURRENT_POINTER, JSON.stringify({ name }), 'utf8');
    res.json({ ok: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/shows/:name
// ---------------------------------------------------------------------------
router.delete('/:name', (req, res) => {
  try {
    const fp = showPath(req.params.name);
    if (!fp.startsWith(SHOWS_DIR)) {
      return res.status(400).json({ error: 'Invalid show name' });
    }
    if (!fs.existsSync(fp)) {
      return res.status(404).json({ error: 'Show not found' });
    }
    fs.unlinkSync(fp);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
