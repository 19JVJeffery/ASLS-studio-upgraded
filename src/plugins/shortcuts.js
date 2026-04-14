/**
 * Keyboard Shortcut Registry (frontend)
 *
 * Centralises all keyboard shortcuts so they can be discovered,
 * overridden, and documented in one place.
 *
 * Usage:
 *   import Shortcuts from '@/plugins/shortcuts';
 *
 *   // Register a handler
 *   Shortcuts.register('Ctrl+S', 'Save show locally', () => show.persistLocally());
 *
 *   // Unregister
 *   Shortcuts.unregister('Ctrl+S');
 *
 *   // Mount/unmount the global keydown listener
 *   Shortcuts.mount();
 *   Shortcuts.unmount();
 */

/** @type {Map<string, { description: string, handler: Function }>} */
const _registry = new Map();

/**
 * Normalise a key combo string to a canonical form.
 * e.g. 'ctrl+s', 'CTRL+S', 'Ctrl+s' → 'Ctrl+S'
 */
function normalise(combo) {
  return combo
    .split('+')
    .map((part) => {
      const p = part.trim().toLowerCase();
      if (p === 'ctrl' || p === 'control') return 'Ctrl';
      if (p === 'shift') return 'Shift';
      if (p === 'alt') return 'Alt';
      if (p === 'meta') return 'Meta';
      return part.trim().toUpperCase(); // key name
    })
    .join('+');
}

/**
 * Build a combo string from a KeyboardEvent.
 */
function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  // Use code for layout-independent keys (F1-F12, Space, ArrowUp …)
  // and key for printable characters.
  let key = e.key;
  if (key === ' ') key = 'SPACE';
  if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}

function _handleKeydown(e) {
  // Don't intercept shortcuts when typing in an input
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

  const combo = comboFromEvent(e);
  const entry = _registry.get(combo);
  if (entry) {
    e.preventDefault();
    entry.handler(e);
  }
}

const Shortcuts = {
  /**
   * Register a keyboard shortcut.
   *
   * @param {string} combo       – e.g. 'Ctrl+S', 'Space', 'F1'
   * @param {string} description – human-readable description
   * @param {Function} handler   – callback(event)
   */
  register(combo, description, handler) {
    _registry.set(normalise(combo), { description, handler });
  },

  /**
   * Unregister a keyboard shortcut.
   *
   * @param {string} combo
   */
  unregister(combo) {
    _registry.delete(normalise(combo));
  },

  /**
   * Return all registered shortcuts as an array for display in a help panel.
   *
   * @returns {Array<{combo: string, description: string}>}
   */
  list() {
    return Array.from(_registry.entries()).map(([combo, entry]) => ({
      combo,
      description: entry.description,
    }));
  },

  /**
   * Mount the global keydown listener.  Call once on app startup.
   */
  mount() {
    window.removeEventListener('keydown', _handleKeydown);
    window.addEventListener('keydown', _handleKeydown);
  },

  /**
   * Unmount the global keydown listener.
   */
  unmount() {
    window.removeEventListener('keydown', _handleKeydown);
  },
};

export default Shortcuts;
