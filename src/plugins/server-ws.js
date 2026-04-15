/**
 * Server WebSocket client (frontend plugin)
 *
 * Connects to the ASLS Studio backend server WebSocket at /ws.
 * Provides:
 *  - DMX universe streaming (browser → server → hardware)
 *  - Show persistence (browser → server filesystem)
 *  - Remote control event reception (server → browser)
 *  - OSC message reception (server → browser)
 *
 * Usage:
 *   import ServerWS from '@/plugins/server-ws';
 *   ServerWS.connect();
 *   ServerWS.sendUniverse(0, dmxBuffer);
 *   ServerWS.saveShow('my-show', showData);
 *   ServerWS.on('remote:go', () => { ... });
 */

import { EventEmitter } from 'events';

class ServerWSClient extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connected = false;
    this._reconnectTimer = null;
    this._reconnectDelay = 2000;
  }

  /**
   * Open the WebSocket connection to the backend server.
   */
  connect() {
    if (this.ws && this.ws.readyState <= 1) return; // already connecting/connected

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this._reconnectDelay = 2000;
      this.emit('connected');
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.emit('disconnected');
      // Auto-reconnect
      this._reconnectTimer = setTimeout(() => this.connect(), this._reconnectDelay);
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, 30000);
    };

    this.ws.onerror = () => {
      // close handler will fire next; errors are normal when server is not yet running
    };

    this.ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type) {
          this.emit(msg.type, msg);
        }
      } catch (_) { /* ignore */ }
    };
  }

  /**
   * Close the connection and stop auto-reconnect.
   */
  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = () => {};
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  /**
   * Stream a DMX universe buffer to the backend for hardware output.
   *
   * @param {number} universe - universe index
   * @param {Uint8Array|number[]} buf - 512-byte DMX buffer
   */
  sendUniverse(universe, buf) {
    this._send({ type: 'dmx', universe, data: Array.from(buf) });
  }

  /**
   * Persist show data on the server filesystem.
   *
   * @param {string} name - show name (file stem)
   * @param {Object} data - show data object
   */
  saveShow(name, data) {
    this._send({ type: 'show:save', name, data });
  }

  /**
   * Send a GO event (advance cue stack).
   */
  go() {
    this._send({ type: 'cue:go' });
  }

  /**
   * Send a BACK event (step cue stack back).
   */
  back() {
    this._send({ type: 'cue:back' });
  }
}

const ServerWS = new ServerWSClient();

// Auto-connect when the module loads (the server may not be running in
// pure dev mode, so failures are silently recovered via auto-reconnect).
ServerWS.connect();

export default ServerWS;
