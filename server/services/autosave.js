/**
 * Auto-save service
 *
 * Periodically saves a copy of the current show to disk.
 * The browser signals the server whenever the show data changes by sending
 * a WebSocket message of type 'show:save' (see server/index.js).
 *
 * A time-based fallback snapshot is also triggered every INTERVAL_MS.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const SHOWS_DIR = path.join(os.homedir(), '.asls-studio', 'shows');
const AUTOSAVE_FILE = path.join(os.homedir(), '.asls-studio', 'autosave.json');
const INTERVAL_MS = parseInt(process.env.AUTOSAVE_INTERVAL_MS || '60000', 10);

let _pendingData = null;
let _pendingName = null;
let _timer = null;

const AutoSave = {
  /**
   * Initialise the periodic flush timer.
   */
  init() {
    if (!fs.existsSync(SHOWS_DIR)) {
      fs.mkdirSync(SHOWS_DIR, { recursive: true });
    }
    _timer = setInterval(() => {
      this.flush();
    }, INTERVAL_MS);
    // Ensure the timer does not prevent process exit
    if (_timer.unref) _timer.unref();
  },

  /**
   * Accept show data from the WebSocket message handler.
   *
   * @param {string} name  - show name (used as file-stem)
   * @param {Object} data  - show data object
   */
  save(name, data) {
    _pendingName = name || 'autosave';
    _pendingData = data;
    // Also write the hot autosave file immediately
    try {
      fs.writeFileSync(AUTOSAVE_FILE, JSON.stringify({ name: _pendingName, data: _pendingData }), 'utf8');
    } catch (_) { /* ignore */ }
  },

  /**
   * Flush pending data to the named show file.
   */
  flush() {
    if (!_pendingData || !_pendingName) return;
    try {
      const safe = path.basename(_pendingName).replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\.json$/, '') + '.json';
      const fp = path.join(SHOWS_DIR, safe);
      _pendingData._version = _pendingData._version || 1;
      fs.writeFileSync(fp, JSON.stringify(_pendingData, null, 2), 'utf8');
    } catch (err) {
      console.warn('AutoSave flush failed:', err.message);
    }
  },

  /**
   * Return the autosave data if it exists (for crash recovery on startup).
   *
   * @returns {{ name: string, data: Object } | null}
   */
  recover() {
    try {
      if (fs.existsSync(AUTOSAVE_FILE)) {
        return JSON.parse(fs.readFileSync(AUTOSAVE_FILE, 'utf8'));
      }
    } catch (_) { /* ignore */ }
    return null;
  },

  stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
    this.flush();
  },
};

export default AutoSave;
