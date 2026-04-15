/**
 * Virtual DMX output driver
 *
 * Forwards universe data to browser clients connected via WebSocket.
 * This replaces the previous WebRTC approach for local use and lets the
 * browser visualizer update in real time from server-side DMX data.
 *
 * Config shape:
 *  {
 *    universe: 0,
 *  }
 */

// virtualClients is the Set exported from server/index.js.
// We import it lazily to avoid circular-module issues.
let _virtualClients = null;

function getClients() {
  if (!_virtualClients) {
    // Lazy import to avoid ESM circular dependency
    // eslint-disable-next-line global-require
    _virtualClients = require('../index.js').virtualClients;
  }
  return _virtualClients;
}

class VirtualDriver {
  constructor(config = {}) {
    this.universe = config.universe ?? 0;
    this.connected = false;
  }

  connect() {
    this.connected = true;
  }

  /**
   * Broadcast the DMX buffer to all connected browser WS clients.
   *
   * @param {Buffer} buf
   */
  send(buf) {
    if (!this.connected) return;
    const msg = JSON.stringify({
      type: 'dmx:virtual',
      universe: this.universe,
      data: Array.from(buf),
    });
    // We access the clients from the main module at send-time, not import-time.
    try {
      const clients = getClients();
      clients.forEach((ws) => {
        if (ws.readyState === 1 /* OPEN */) ws.send(msg);
      });
    } catch (_) { /* module not ready yet */ }
  }

  disconnect() {
    this.connected = false;
  }

  toJSON() {
    return {
      type: 'virtual',
      universe: this.universe,
      connected: this.connected,
    };
  }
}

export default VirtualDriver;
