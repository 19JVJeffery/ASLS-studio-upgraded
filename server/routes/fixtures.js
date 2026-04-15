/**
 * Fixture library routes
 *
 * Routes
 *  GET /api/fixtures            – returns the fixture_list.json index
 *  GET /api/fixtures/:mfr/:model – returns a specific OFL fixture JSON
 *  POST /api/fixtures/import    – import a custom OFL JSON fixture
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Public fixtures shipped with the app (inside /public/fixtures)
const PUBLIC_FIXTURES = path.resolve(__dirname, '..', '..', 'public', 'fixtures');

// User-imported fixtures are stored as entries in a single manifest file.
// This avoids using user-supplied strings as filesystem path components.
const USER_FIXTURES_DIR = path.join(os.homedir(), '.asls-studio');
const USER_FIXTURES_MANIFEST = path.join(USER_FIXTURES_DIR, 'user-fixtures.json');

if (!fs.existsSync(USER_FIXTURES_DIR)) {
  fs.mkdirSync(USER_FIXTURES_DIR, { recursive: true });
}

/** Load the user-fixture manifest (a plain object keyed by "manufacturer/model"). */
function loadManifest() {
  if (fs.existsSync(USER_FIXTURES_MANIFEST)) {
    try {
      return JSON.parse(fs.readFileSync(USER_FIXTURES_MANIFEST, 'utf8'));
    } catch (_) { /* corrupt – treat as empty */ }
  }
  return {};
}

/** Persist the user-fixture manifest to disk. */
function saveManifest(manifest) {
  fs.writeFileSync(USER_FIXTURES_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// GET /api/fixtures  – merged fixture list (shipped + user-imported)
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const listPath = path.join(PUBLIC_FIXTURES, 'fixture_list.json');
    const publicList = fs.existsSync(listPath)
      ? JSON.parse(fs.readFileSync(listPath, 'utf8'))
      : {};

    // Append user-imported manufacturers/models from the manifest
    const manifest = loadManifest();
    Object.keys(manifest).forEach((key) => {
      const slash = key.indexOf('/');
      if (slash < 0) return;
      const mfr = key.slice(0, slash);
      const model = key.slice(slash + 1);
      if (!publicList[mfr]) publicList[mfr] = [];
      if (!publicList[mfr].includes(model)) publicList[mfr].push(model);
    });

    res.json(publicList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fixtures/:manufacturer/:model
// ---------------------------------------------------------------------------
router.get('/:manufacturer/:model', (req, res) => {
  const { manufacturer, model } = req.params;
  // Security: strip any path traversal and limit to safe filename characters
  const safeMfr = path.basename(manufacturer).replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeModel = path.basename(model).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/\.json$/, '');

  // Check user-imported manifest first (no filesystem path from user input)
  const manifest = loadManifest();
  const key = `${safeMfr}/${safeModel}`;
  if (Object.prototype.hasOwnProperty.call(manifest, key)) {
    return res.json(manifest[key]);
  }

  // Fall back to public fixtures (static paths only)
  const fp = path.join(PUBLIC_FIXTURES, safeMfr, `${safeModel}.json`);
  // Containment guard
  if (!fp.startsWith(PUBLIC_FIXTURES + path.sep)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (fs.existsSync(fp)) {
    return res.json(JSON.parse(fs.readFileSync(fp, 'utf8')));
  }
  res.status(404).json({ error: 'Fixture not found' });
});

// ---------------------------------------------------------------------------
// POST /api/fixtures/import  – body: OFL fixture JSON
// Store the fixture data in the manifest JSON (user values never become paths)
// ---------------------------------------------------------------------------
router.post('/import', (req, res) => {
  try {
    const fixture = req.body;
    if (!fixture || typeof fixture.manufacturer !== 'string' || typeof fixture.name !== 'string') {
      return res.status(400).json({ error: 'Invalid OFL fixture JSON' });
    }
    // Sanitise for display/key use only – these values are stored as JSON keys, NOT as paths
    const mfr = fixture.manufacturer.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const model = fixture.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

    const SAFE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
    if (!SAFE_PATTERN.test(mfr) || !SAFE_PATTERN.test(model)) {
      return res.status(400).json({ error: 'Invalid manufacturer or model name' });
    }

    // Write to the manifest (fixed filesystem path – no user value in the path)
    const manifest = loadManifest();
    manifest[`${mfr}/${model}`] = fixture;
    saveManifest(manifest);
    res.json({ ok: true, manufacturer: mfr, model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
