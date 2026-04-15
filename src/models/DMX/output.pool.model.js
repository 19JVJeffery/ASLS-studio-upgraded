import WebShowSclient from '@/plugins/webshow';
import ServerOutput from '@/plugins/server-output';

/**
 * Output type identifiers.
 *
 * @enum {string}
 */
export const OUTPUT_TYPES = {
  WSC: 'WSC (Web Show Control)',
  ARTNET: 'Art-Net',
  SACN: 'sACN (E1.31)',
  VIRTUAL: 'Virtual (Visualizer only)',
};

/**
 * @class OutputPool
 * @classdesc Pool of output instances
 */
class OutputPool {
  constructor() {
    this.outputs = [];
    this.selected = [0];
  }

  /**
   * Outputs exportable show data chunk
   *
   * @readonly
   * @type {Object}
   */
  get showData() {
    return this.outputs.map((output) => ({
      id: output.id,
      name: output.name,
      color: output.color,
      remote: output.remote,
      port: output.port,
      universe: output.universe.id,
      protocol: output.protocol ?? OUTPUT_TYPES.WSC,
    }));
  }

  /**
   * Pool's listable data
   *
   * @readonly
   * @type {Array}
   */
  get listable() {
    return this.outputs.map((output) => ({
      id: output.id,
      name: `${output.name} - ${output.remote}`,
      color: output.color,
      icon: 'patch',
      action: {
        label: 'connect',
        action: output.connect,
      },
    }));
  }

  /**
   * Returns output instance from provided ID
   *
   * @public
   * @param {Number} id
   * @return {Object} Output instance
   */
  getFromId(id) {
    const output = this.outputs.find((u) => u.id === Number(id));
    if (output) {
      return output;
    }
    throw new Error('Cannot find output in pool');
  }

  /**
   * Creates a new output instance from provided configuration data and pushes it to the pool.
   * Supports both legacy WSC outputs and new server-backed protocol outputs.
   *
   * @public
   * @param {Object} outputData output configuration object
   * @param {string} [outputData.protocol] – output protocol type
   * @return {Object} Output instance
   */
  addRaw(outputData = {}) {
    try {
      const protocol = outputData.protocol ?? OUTPUT_TYPES.WSC;
      let output;

      if (protocol === OUTPUT_TYPES.WSC) {
        // Legacy WebRTC-based transport
        output = new WebShowSclient(
          outputData.remote,
          outputData.port,
          outputData.universe,
          outputData.name,
        );
      } else {
        // Server-backed transport (Art-Net, sACN, Virtual all route through the backend)
        let universeIndex = 0;
        if (outputData.universe) {
          universeIndex = typeof outputData.universe === 'object'
            ? outputData.universe.id
            : outputData.universe;
        }
        output = new ServerOutput(outputData.universe, universeIndex, outputData.name);
        output.remote = outputData.remote ?? '127.0.0.1';
        output.port = outputData.port ?? 3000;
        output.protocol = protocol;
        output.color = outputData.color;
        output.debug = output.debug ?? [];
      }

      output.id = this.genOutputId();
      output._animationId = null;
      this.outputs.push(output);
      return output;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  /**
   * Removes output from pool
   *
   * @public
   * @param {Object} output output instance handle
   */
  delete(output) {
    const outputIndex = this.outputs.findIndex((item) => item.id === output.id);
    if (outputIndex > -1) {
      if (typeof this.outputs[outputIndex].handleClosure === 'function') {
        this.outputs[outputIndex].handleClosure();
      }
      this.outputs.splice(outputIndex, 1);
    } else {
      throw new Error('Could not find output in output pool');
    }
  }

  /**
   * Clears all output instances from pool
   *
   * @public
   */
  clearAll() {
    for (let i = this.outputs.length - 1; i >= 0; i--) {
      this.delete(this.outputs[i]);
    }
  }

  /**
   * Generates output unique ID
   *
   * @public
   * @returns {Number} The output's unique ID
   */
  genOutputId() {
    return this.outputs.reduce(
      (prev, current) => (
        (prev && prev.id > current.id)
          ? prev.id
          : current.id
      ),
      -1,
    ) + 1;
  }
}

export default OutputPool;
