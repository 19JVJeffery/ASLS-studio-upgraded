/**
 * Web MIDI API integration (frontend)
 *
 * Provides a thin wrapper around the Web MIDI API so MIDI controllers
 * can be bound to show actions (cue GO, faders, chase start/stop …).
 *
 * Usage:
 *   import MidiController from '@/plugins/midi';
 *
 *   await MidiController.init();                  // request MIDI access
 *   MidiController.onNote(0x90, 1, 60, handler); // note-on ch1 C4
 *   MidiController.onCC(0xB0, 1, 7, handler);    // CC ch1 #7
 *   MidiController.dispose();
 */

import { EventEmitter } from 'events';

class MidiController extends EventEmitter {
  constructor() {
    super();
    this._access = null;
    this._bindings = []; // { status, channel, note/cc, handler }
  }

  /**
   * Request Web MIDI access.  Resolves `true` if successful.
   */
  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser.');
      return false;
    }
    try {
      this._access = await navigator.requestMIDIAccess({ sysex: false });
      this._access.inputs.forEach((input) => {
        input.onmidimessage = this._handleMessage.bind(this);
      });
      // Watch for new devices
      this._access.onstatechange = () => {
        this._access.inputs.forEach((input) => {
          input.onmidimessage = this._handleMessage.bind(this);
        });
      };
      return true;
    } catch (err) {
      console.warn('MIDI access denied:', err.message);
      return false;
    }
  }

  _handleMessage(event) {
    const [status, data1, data2] = event.data;
    // eslint-disable-next-line no-bitwise
    const type = status & 0xF0;
    // eslint-disable-next-line no-bitwise
    const channel = (status & 0x0F) + 1; // 1-16

    this.emit('message', {
      status, type, channel, data1, data2,
    });

    this._bindings.forEach(({
      msgType, ch, key, handler,
    }) => {
      if (msgType === type && (ch === 0 || ch === channel) && (key < 0 || key === data1)) {
        handler({ channel, value: data2, note: data1 });
      }
    });
  }

  /**
   * Bind a handler to a Note On message.
   *
   * @param {number} channel - MIDI channel (1-16, or 0 for any)
   * @param {number} note    - MIDI note number (0-127, or -1 for any)
   * @param {Function} handler
   */
  onNote(channel, note, handler) {
    this._bindings.push({
      msgType: 0x90, ch: channel, key: note, handler,
    });
  }

  /**
   * Bind a handler to a Control Change message.
   *
   * @param {number} channel     - MIDI channel (1-16, or 0 for any)
   * @param {number} controller  - CC number (0-127, or -1 for any)
   * @param {Function} handler
   */
  onCC(channel, controller, handler) {
    this._bindings.push({
      msgType: 0xB0, ch: channel, key: controller, handler,
    });
  }

  /**
   * Remove all bindings for a given handler function.
   *
   * @param {Function} handler
   */
  unbind(handler) {
    this._bindings = this._bindings.filter((b) => b.handler !== handler);
  }

  /**
   * Clear all bindings and release the MIDI access object.
   */
  dispose() {
    this._bindings = [];
    this._access = null;
  }

  /**
   * Return a list of connected MIDI input device names.
   */
  get inputs() {
    if (!this._access) return [];
    return Array.from(this._access.inputs.values()).map((i) => i.name);
  }
}

export default new MidiController();
