/**
 * sACN / E1.31 DMX output driver
 *
 * Sends 512-byte DMX universe buffers via sACN (E1.31) UDP multicast or unicast.
 * Uses the `sacn` npm package.
 *
 * Config shape:
 *  {
 *    universe:   1,                  // sACN universe (1-63999)
 *    ip:         '239.255.0.1',      // unicast target IP (optional; multicast if omitted)
 *    priority:   100,                // sACN priority (default 100)
 *    iface:      '0.0.0.0',          // network interface (optional)
 *    sourceLabel: 'ASLS Studio',     // source name in sACN packet
 *  }
 */

import { Sender } from 'sacn';

class SACNDriver {
  constructor(config = {}) {
    this.universe = config.universe ?? 1; // sACN universes start at 1
    this.ip = config.ip || null; // null = multicast
    this.priority = config.priority ?? 100;
    this.iface = config.iface || undefined;
    this.sourceLabel = config.sourceLabel || 'ASLS Studio';
    this._sender = null;
    this.connected = false;
  }

  /**
   * Open the sACN sender socket.
   */
  connect() {
    if (this.connected) return;
    const opts = {
      universe: this.universe,
      priority: this.priority,
      reuseAddr: true,
    };
    if (this.ip) opts.ip = this.ip;
    if (this.iface) opts.iface = this.iface;
    this._sender = new Sender(opts);
    this.connected = true;
  }

  /**
   * Send a 512-byte DMX buffer.
   *
   * @param {Buffer} buf
   */
  async send(buf) {
    if (!this.connected || !this._sender) return;
    // sacn Sender expects an object mapping slot(1-512) → value(0-255)
    const payload = {};
    for (let i = 0; i < 512; i++) {
      payload[i + 1] = buf[i] ?? 0;
    }
    try {
      await this._sender.send({ payload, sourceName: this.sourceLabel });
    } catch (_) { /* ignore send errors */ }
  }

  /**
   * Close the sender socket.
   */
  disconnect() {
    if (this._sender && typeof this._sender.close === 'function') {
      this._sender.close();
    }
    this._sender = null;
    this.connected = false;
  }

  toJSON() {
    return {
      type: 'sacn',
      universe: this.universe,
      ip: this.ip,
      priority: this.priority,
      connected: this.connected,
    };
  }
}

export default SACNDriver;
