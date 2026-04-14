/**
 * OSC listener service
 *
 * Listens for OSC messages on a UDP port and emits them to connected
 * browser clients as WebSocket messages.
 *
 * The browser side (src/plugins/osc-client.js) subscribes to those messages
 * and maps them to cue/chase/master actions.
 *
 * Example OSC address patterns:
 *  /cue/<groupId>/<cueId>/go
 *  /cue/<groupId>/<cueId>/stop
 *  /chase/<groupId>/<chaseId>/go
 *  /chase/<groupId>/<chaseId>/stop
 *  /master/bpm  <value>
 *  /go
 *  /back
 */

import { Server as OscServer } from 'node-osc';

const OscService = {
  _server: null,

  /**
   * Start the OSC UDP listener.
   *
   * @param {number} port - UDP port to bind (default 8000)
   * @param {Function} onMessage - callback(address: string, args: any[])
   */
  start(port = 8000, onMessage = () => {}) {
    if (this._server) return; // already running

    try {
      this._server = new OscServer(port, '0.0.0.0', () => {
        console.log(`OSC server listening on UDP port ${port}`);
      });

      this._server.on('message', (msg) => {
        const [address, ...args] = msg;
        onMessage(address, args);
      });

      this._server.on('error', (err) => {
        console.error('OSC server error:', err.message);
      });
    } catch (err) {
      console.warn(`Could not start OSC server on port ${port}:`, err.message);
    }
  },

  stop() {
    if (this._server) {
      this._server.close();
      this._server = null;
    }
  },
};

export default OscService;
