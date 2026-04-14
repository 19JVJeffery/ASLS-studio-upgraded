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
// User-imported fixtures in ~/.asls-studio/fixtures
const USER_FIXTURES = path.join(os.homedir(), '.asls-studio', 'fixtures');

if (!fs.existsSync(USER_FIXTURES)) {
  fs.mkdirSync(USER_FIXTURES, { recursive: true });
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

    // Append user-imported manufacturers/models
    const userMfrs = fs.readdirSync(USER_FIXTURES).filter(
      (d) => fs.statSync(path.join(USER_FIXTURES, d)).isDirectory(),
    );
    userMfrs.forEach((mfr) => {
      if (!publicList[mfr]) publicList[mfr] = [];
      const models = fs.readdirSync(path.join(USER_FIXTURES, mfr))
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
      models.forEach((m) => {
        if (!publicList[mfr].includes(m)) publicList[mfr].push(m);
      });
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
  const safeMfr = path.basename(manufacturer).replace(/[^a-zA-Z0-9_\-]/g, '-');
  const safeModel = path.basename(model).replace(/[^a-zA-Z0-9_\-]/g, '-').replace(/\.json$/, '');

  // Check public first, then user directory
  for (const base of [PUBLIC_FIXTURES, USER_FIXTURES]) {
    const fp = path.join(base, safeMfr, `${safeModel}.json`);
    // Guard against directory traversal even after basename sanitisation
    if (!fp.startsWith(base + path.sep) && fp !== base) {
      continue; // eslint-disable-line no-continue
    }
    if (fs.existsSync(fp)) {
      return res.json(JSON.parse(fs.readFileSync(fp, 'utf8')));
    }
  }
  res.status(404).json({ error: 'Fixture not found' });
});

// ---------------------------------------------------------------------------
// POST /api/fixtures/import  – body: OFL fixture JSON
// ---------------------------------------------------------------------------
router.post('/import', (req, res) => {
  try {
    const fixture = req.body;
    if (!fixture || typeof fixture.manufacturer !== 'string' || typeof fixture.name !== 'string') {
      return res.status(400).json({ error: 'Invalid OFL fixture JSON' });
    }
    // Sanitise to only safe characters so the values cannot escape the target dir
    const mfr = fixture.manufacturer.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const model = fixture.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

    if (!mfr || !model) {
      return res.status(400).json({ error: 'Invalid manufacturer or model name' });
    }

    // Resolve and verify the target paths stay inside USER_FIXTURES
    const mfrDir = path.resolve(USER_FIXTURES, mfr);
    const targetFile = path.resolve(mfrDir, `${model}.json`);

    if (!mfrDir.startsWith(USER_FIXTURES + path.sep) && mfrDir !== USER_FIXTURES) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!targetFile.startsWith(mfrDir + path.sep) && targetFile !== mfrDir) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(mfrDir)) fs.mkdirSync(mfrDir, { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(fixture, null, 2));
    res.json({ ok: true, manufacturer: mfr, model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
