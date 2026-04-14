/**
 * Server DMX Output
 *
 * Streams 512-byte DMX universe buffers to the ASLS Studio backend server
 * via WebSocket.  The backend then fans the data out to any configured
 * hardware drivers (Art-Net, sACN, USB-DMX, etc.).
 *
 * This replaces / supplements the WebRTC transport for local hosted use.
 */

import { EventEmitter } from 'events';
import ServerWS from './server-ws';

export const SERVER_OUTPUT_STATE = {
  ERROR: -1,
  IDLE: 0,
  CONNECTING: 1,
  CONNECTED: 2,
};

export const DEBUGGER_LOG_TYPE = {
  ERROR: -1,
  INFO: 0,
  SUCCESS: 1,
};

const DEBUG_QUEUE_MAXLEN = 100;
const DEFAULT_REFRESH_MS = 25; // 40 Hz

class ServerOutput extends EventEmitter {
  /**
   * @param {Object} universe – universe instance handle
   * @param {number} universeIndex – 0-based universe index for the backend
   * @param {string} name – display name
   */
  constructor(universe, universeIndex = 0, name = 'Server Output') {
    super();
    this.universe = universe;
    this.universeIndex = universeIndex;
    this.name = name;
    this.state = SERVER_OUTPUT_STATE.IDLE;
    this.debug = [];
    this._animationId = null;
  }

  _log(type, data) {
    this.debug.push({
      type,
      data,
      timestamp: new Date().toLocaleTimeString(),
    });
    if (this.debug.length > DEBUG_QUEUE_MAXLEN) {
      this.debug.shift();
    }
  }

  /**
   * Start streaming DMX data to the backend server.
   */
  connect() {
    if (this.state === SERVER_OUTPUT_STATE.CONNECTED) return;
    this.state = SERVER_OUTPUT_STATE.CONNECTING;
    this._log(DEBUGGER_LOG_TYPE.INFO, 'Connecting to backend server…');

    ServerWS.once('connected', () => {
      this.state = SERVER_OUTPUT_STATE.CONNECTED;
      this._log(DEBUGGER_LOG_TYPE.SUCCESS, 'Connected to backend server.');
      this._startStreaming();
    });

    ServerWS.once('disconnected', () => {
      if (this.state === SERVER_OUTPUT_STATE.CONNECTED) {
        this.state = SERVER_OUTPUT_STATE.ERROR;
        this._log(DEBUGGER_LOG_TYPE.ERROR, 'Disconnected from backend server.');
        this._stopStreaming();
      }
    });

    // If already connected, start streaming immediately
    if (ServerWS.connected) {
      this.state = SERVER_OUTPUT_STATE.CONNECTED;
      this._log(DEBUGGER_LOG_TYPE.SUCCESS, 'Already connected to backend server.');
      this._startStreaming();
    }
  }

  _startStreaming() {
    if (this._animationId) return;
    const tick = () => {
      if (!ServerWS.connected || !this.universe) return;
      const buf = this.universe.getDMXBuffer?.() ?? this._buildBuffer();
      ServerWS.sendUniverse(this.universeIndex, buf);
      this._animationId = setTimeout(tick, DEFAULT_REFRESH_MS);
    };
    tick();
  }

  _stopStreaming() {
    if (this._animationId) {
      clearTimeout(this._animationId);
      this._animationId = null;
    }
  }

  /**
   * Build a 512-byte buffer from the universe's fixtures.
   */
  _buildBuffer() {
    const buf = new Uint8Array(512);
    if (this.universe && this.universe.fixtures) {
      this.universe.fixtures.forEach((fixture) => {
        if (!fixture || !fixture.channels) return;
        fixture.channels.forEach((channel, idx) => {
          const addr = (fixture.chStart - 1) + idx;
          if (addr >= 0 && addr < 512) {
            buf[addr] = Math.max(0, Math.min(255, Math.round(channel.value?.DMX ?? 0)));
          }
        });
      });
    }
    return buf;
  }

  /**
   * Stop streaming and disconnect.
   */
  handleClosure() {
    this._stopStreaming();
    this.state = SERVER_OUTPUT_STATE.IDLE;
    this._log(DEBUGGER_LOG_TYPE.INFO, 'Disconnected.');
  }
}

export default ServerOutput;
