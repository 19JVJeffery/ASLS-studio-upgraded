/**
 * Driver Manager
 *
 * Keeps a runtime registry of active output driver instances and routes
 * incoming DMX universe buffers to the correct drivers.
 *
 * Output session shape:
 *  {
 *    id:       string,  // UUID
 *    type:     'artnet' | 'sacn' | 'virtual',
 *    universe: number,
 *    name:     string,
 *    driver:   ArtNetDriver | SACNDriver | VirtualDriver,
 *  }
 */

import { randomUUID } from 'crypto';
import ArtNetDriver from '../drivers/artnet.driver.js';
import SACNDriver from '../drivers/sacn.driver.js';
import VirtualDriver from '../drivers/virtual.driver.js';

const sessions = new Map(); // id → session

function createDriver(type, config) {
  switch (type) {
    case 'artnet': return new ArtNetDriver(config);
    case 'sacn': return new SACNDriver(config);
    case 'virtual': return new VirtualDriver(config);
    default: throw new Error(`Unknown driver type: ${type}`);
  }
}

const DriverManager = {
  /**
   * Return a serialisable list of all sessions.
   */
  list() {
    return Array.from(sessions.values()).map((s) => ({
      id: s.id,
      type: s.type,
      universe: s.universe,
      name: s.name,
      ...s.driver.toJSON(),
    }));
  },

  /**
   * Create and register a new output session.
   *
   * @param {Object} opts
   * @param {string} opts.type
   * @param {number} opts.universe
   * @param {string} [opts.name]
   * @param {*} opts rest of driver config
   */
  create(opts = {}) {
    const { type, universe = 0, name = `${type} ${universe}`, ...config } = opts;
    const driver = createDriver(type, { universe, ...config });
    const id = randomUUID();
    const session = { id, type, universe, name, driver };
    sessions.set(id, session);
    return { id, type, universe, name, connected: false };
  },

  /**
   * Remove and disconnect a session by ID.
   */
  remove(id) {
    const session = sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    session.driver.disconnect();
    sessions.delete(id);
  },

  /**
   * Connect a session.
   */
  connect(id) {
    const session = sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    session.driver.connect();
  },

  /**
   * Disconnect a session without removing it.
   */
  disconnect(id) {
    const session = sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    session.driver.disconnect();
  },

  /**
   * Route a 512-byte DMX buffer to all connected drivers for the given universe.
   *
   * @param {number} universe
   * @param {Buffer} buf
   */
  send(universe, buf) {
    sessions.forEach((session) => {
      if (session.universe === universe && session.driver.connected) {
        session.driver.send(buf);
      }
    });
  },
};

export default DriverManager;
