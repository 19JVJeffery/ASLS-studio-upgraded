/**
 * Art-Net DMX output driver
 *
 * Sends 512-byte DMX universe buffers to an Art-Net node via UDP.
 * Uses the `artnet` npm package.
 *
 * Config shape (passed from the browser via POST /api/outputs):
 *  {
 *    host:     '192.168.1.100',  // Art-Net node IP
 *    universe: 0,                // DMX universe index (0-based)
 *    subnet:   0,                // Art-Net subnet (default 0)
 *    net:      0,                // Art-Net net     (default 0)
 *  }
 */

import artnet from 'artnet';

class ArtNetDriver {
  constructor(config = {}) {
    this.host = config.host || '255.255.255.255'; // broadcast by default
    this.universe = config.universe ?? 0;
    this.subnet = config.subnet ?? 0;
    this.net = config.net ?? 0;
    this._client = null;
    this.connected = false;
  }

  /**
   * Open the Art-Net connection.
   */
  connect() {
    if (this.connected) return;
    this._client = artnet({
      host: this.host,
      sendAll: true,
      refresh: 25, // 40 Hz
      net: this.net,
      subnet: this.subnet,
      universe: this.universe,
    });
    this.connected = true;
  }

  /**
   * Send a 512-byte DMX buffer.
   *
   * @param {Buffer} buf - 512-byte Uint8Array / Buffer
   */
  send(buf) {
    if (!this.connected || !this._client) return;
    // artnet expects a plain array of values
    this._client.set(this.universe, 1, Array.from(buf));
  }

  /**
   * Close the connection and free resources.
   */
  disconnect() {
    if (this._client && typeof this._client.close === 'function') {
      this._client.close();
    }
    this._client = null;
    this.connected = false;
  }

  toJSON() {
    return {
      type: 'artnet',
      host: this.host,
      universe: this.universe,
      subnet: this.subnet,
      net: this.net,
      connected: this.connected,
    };
  }
}

export default ArtNetDriver;
