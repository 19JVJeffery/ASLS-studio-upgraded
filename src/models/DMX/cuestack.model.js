/**
 * @class CueStack
 * @classdesc A CueStack is an ordered, numbered list of cues that can be stepped
 * through sequentially by an operator pressing GO / BACK.
 *
 * Each entry in the stack is a reference to an existing Cue in a Group's CuePool,
 * augmented with cue-stack-specific properties:
 *  - order       {Number}  – 1-based position in the stack
 *  - inTime      {Number}  – fade-in time in seconds (overrides cue default)
 *  - outTime     {Number}  – fade-out time in seconds
 *  - dwellTime   {Number}  – how long to hold before auto-advancing (0 = manual)
 *  - tracking    {Boolean} – whether to carry forward unset channels from previous cue
 *  - flags       {Object}  – { block, skip, loop }
 *
 * Usage:
 *   const stack = new CueStack();
 *   stack.addEntry({ cue, groupId });
 *   stack.go();   // advance to next cue
 *   stack.back(); // step back one cue
 */

class CueStackEntry {
  constructor(data = {}) {
    this.order = data.order ?? 1;
    this.cue = data.cue;           // reference to Cue / Scene / Effect instance
    this.groupId = data.groupId;   // owning group ID (for re-hydration)
    this.cueId = data.cueId ?? data.cue?.id;
    this.inTime = data.inTime ?? null;     // null = use cue's own fade
    this.outTime = data.outTime ?? null;
    this.dwellTime = data.dwellTime ?? 0;  // 0 = manual GO
    this.tracking = data.tracking ?? true;
    this.flags = {
      block: data.flags?.block ?? false,
      skip: data.flags?.skip ?? false,
      loop: data.flags?.loop ?? false,
    };
  }

  get showData() {
    return {
      order: this.order,
      groupId: this.groupId,
      cueId: this.cueId,
      inTime: this.inTime,
      outTime: this.outTime,
      dwellTime: this.dwellTime,
      tracking: this.tracking,
      flags: { ...this.flags },
    };
  }
}

/**
 * @class CueStack
 */
class CueStack {
  constructor(data = {}) {
    this.id = data.id ?? 0;
    this.name = data.name ?? `Cue Stack ${this.id}`;
    this._entries = [];
    this._pointer = -1; // index of the currently active entry (-1 = none)
    this._dwellTimer = null;

    if (data.entries) {
      data.entries.forEach((e) => this._entries.push(new CueStackEntry(e)));
    }
  }

  // -------------------------------------------------------------------------
  // Entry management
  // -------------------------------------------------------------------------

  /**
   * Add a cue to the end of the stack.
   *
   * @param {Object} opts - { cue, groupId, ...CueStackEntry options }
   * @returns {CueStackEntry}
   */
  addEntry(opts = {}) {
    const entry = new CueStackEntry({
      ...opts,
      order: this._entries.length + 1,
    });
    this._entries.push(entry);
    return entry;
  }

  /**
   * Remove an entry at the given 0-based index.
   *
   * @param {number} index
   */
  removeEntry(index) {
    if (index < 0 || index >= this._entries.length) return;
    this._entries.splice(index, 1);
    // Re-number
    this._entries.forEach((e, i) => { e.order = i + 1; });
    // Adjust pointer
    if (this._pointer >= this._entries.length) {
      this._pointer = this._entries.length - 1;
    }
  }

  /**
   * Reorder entries: move entry at `fromIndex` to `toIndex`.
   */
  reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [entry] = this._entries.splice(fromIndex, 1);
    this._entries.splice(toIndex, 0, entry);
    this._entries.forEach((e, i) => { e.order = i + 1; });
  }

  // -------------------------------------------------------------------------
  // Playback controls
  // -------------------------------------------------------------------------

  /**
   * Advance to the next non-skipped cue and fire it.
   *
   * @param {Function} [onCue] - callback(entry: CueStackEntry)
   */
  go(onCue = () => {}) {
    this._clearDwellTimer();

    const nextIndex = this._findNext(this._pointer + 1);
    if (nextIndex < 0) return; // end of stack

    this._fireCue(nextIndex, onCue);
  }

  /**
   * Step back to the previous cue.
   *
   * @param {Function} [onCue]
   */
  back(onCue = () => {}) {
    this._clearDwellTimer();

    const prevIndex = this._findPrev(this._pointer - 1);
    if (prevIndex < 0) return;

    this._fireCue(prevIndex, onCue);
  }

  /**
   * Jump directly to a specific entry index.
   *
   * @param {number} index
   * @param {Function} [onCue]
   */
  jumpTo(index, onCue = () => {}) {
    if (index < 0 || index >= this._entries.length) return;
    this._clearDwellTimer();
    this._fireCue(index, onCue);
  }

  /**
   * Stop the active cue and reset the pointer to -1.
   */
  stop() {
    this._clearDwellTimer();
    const active = this.active;
    if (active?.cue?.cue) active.cue.cue(false);
    this._pointer = -1;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  _fireCue(index, onCue) {
    // Stop the currently active cue
    const prevEntry = this.active;
    if (prevEntry?.cue?.cue) prevEntry.cue.cue(false);

    this._pointer = index;
    const entry = this._entries[index];
    if (!entry) return;

    // Fire the cue
    if (entry.cue?.cue) entry.cue.cue(true);
    onCue(entry);

    // Schedule auto-advance if dwellTime is set
    if (entry.dwellTime > 0) {
      this._dwellTimer = setTimeout(() => {
        this.go(onCue);
      }, entry.dwellTime * 1000);
    }

    // Handle loop flag at end of stack
    if (index === this._entries.length - 1 && entry.flags.loop) {
      // Loop back to start after dwell
      if (entry.dwellTime > 0) { /* already scheduled */ } else {
        // Manual loop: reset pointer so next GO starts from top
        this._pointer = -1;
      }
    }
  }

  _findNext(fromIndex) {
    for (let i = fromIndex; i < this._entries.length; i++) {
      if (!this._entries[i].flags.skip) return i;
    }
    return -1;
  }

  _findPrev(fromIndex) {
    for (let i = fromIndex; i >= 0; i--) {
      if (!this._entries[i].flags.skip) return i;
    }
    return -1;
  }

  _clearDwellTimer() {
    if (this._dwellTimer) {
      clearTimeout(this._dwellTimer);
      this._dwellTimer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  /** The currently active CueStackEntry (or null). */
  get active() {
    return this._entries[this._pointer] ?? null;
  }

  /** 0-based pointer to the active entry. */
  get pointer() {
    return this._pointer;
  }

  /** All entries. */
  get entries() {
    return this._entries;
  }

  /** Number of entries. */
  get length() {
    return this._entries.length;
  }

  get showData() {
    return {
      id: this.id,
      name: this.name,
      entries: this._entries.map((e) => e.showData),
    };
  }
}

export { CueStackEntry };
export default CueStack;
