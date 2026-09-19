/**
 * Client session inactivity lock.
 */

export class ClientSessionInactivityLocker {
  /**
   * @param {number} [mins]
   * @param {string} [overlayId]
   * @param {() => void} [onLock] called once the idle overlay engages — e.g. to install a
   *   downloaded update now that no one is actively working.
   */
  constructor(mins = 10, overlayId, onLock) {
    this.timeout = mins * 60000;
    this.el = typeof document !== 'undefined' && overlayId ? document.getElementById(overlayId) : null;
    this.onLock = onLock;
    /** @type {ReturnType<typeof setTimeout>|null} */
    this.handle = null;
    /** @type {Record<string, unknown>|null} */
    this.ctx = null;
    /** @type {Array<{ event: string, fn: () => void }>} */
    this._listeners = [];
  }

  /** @param {{ decryptedPrivateKeyPem?: string|null }} ctx */
  start(ctx) {
    this.ctx = ctx;
    if (typeof window === 'undefined') return;
    ['mousemove', 'keydown', 'click'].forEach((event) => {
      const fn = () => this.reset();
      window.addEventListener(event, fn);
      this._listeners.push({ event, fn });
    });
    this.reset();
  }

  stop() {
    if (typeof window !== 'undefined') {
      this._listeners.forEach(({ event, fn }) => window.removeEventListener(event, fn));
    }
    this._listeners = [];
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }

  reset() {
    if (this.handle) clearTimeout(this.handle);
    this.handle = setTimeout(() => {
      if (this.ctx) this.ctx.decryptedPrivateKeyPem = null;
      if (this.el) this.el.classList.add('active-lock-view-overlay');
      if (typeof this.onLock === 'function') this.onLock();
    }, this.timeout);
  }
}
