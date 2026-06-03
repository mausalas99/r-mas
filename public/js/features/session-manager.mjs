/**
 * Background vitals monitoring and client session inactivity lock.
 */
import {
  frequencyDisplayLabel,
  normalizeFrequencySpec,
} from '../../../lib/entrega/entrega-vitals-plan.mjs';

const FREQ_MS = {
  '1h': 3600000,
  '2h': 7200000,
  '4h': 4 * 3600000,
  Shift_Once: 8 * 3600000,
};

/** @param {string} freq */
export function vitalsIntervalMs(freq) {
  return FREQ_MS[freq] ?? 4 * 3600000;
}

/** @param {string} freq DB enum from active_guardias */
export function vitalsFrequencyNotifyLabel(freq) {
  if (!freq || freq === 'None') return 'signos vitales';
  return frequencyDisplayLabel(normalizeFrequencySpec(freq));
}

/**
 * @param {{ patient_id?: string }} row
 * @param {(patientId: string, row: object) => string} [resolveLabel]
 */
export function resolvePatientLabelForNotify(row, resolveLabel) {
  const id = String(row?.patient_id || '');
  const resolved =
    typeof resolveLabel === 'function' ? String(resolveLabel(id, row) || '').trim() : '';
  return resolved || id;
}

export class BackgroundVitalsMonitorLoop {
  /**
   * @param {{ all: (sql: string, params?: unknown[]) => Promise<Array<{ patient_id: string, last_vitals_check: string, vitals_frequency: string }>> }} db
   * @param {string} userId
   * @param {{ notify?: (title: string, body: string) => void, intervalMs?: number, resolvePatientLabel?: (patientId: string, row: object) => string }} [opts]
   */
  constructor(db, userId, opts = {}) {
    this.db = db;
    this.userId = userId;
    this.resolvePatientLabel = opts.resolvePatientLabel;
    this.notify = opts.notify || ((title, body) => {
      if (typeof Notification !== 'undefined') {
        new Notification(title, { body });
      }
    });
    this.intervalMs = opts.intervalMs ?? 60000;
    /** @type {ReturnType<typeof setInterval>|null} */
    this._timer = null;
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this.scan(), this.intervalMs);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async scan() {
    const rows = await this.db.all(
      "SELECT patient_id, last_vitals_check, vitals_frequency FROM active_guardias WHERE covering_user_id = ? AND status = 'Active'",
      [this.userId]
    );
    rows.forEach((r) => {
      const freq = r.vitals_frequency;
      if (!freq || freq === 'None') return;

      const ms = vitalsIntervalMs(freq);
      const due = new Date(r.last_vitals_check).getTime() + ms;
      const diff = due - Date.now();

      const who = resolvePatientLabelForNotify(r, this.resolvePatientLabel);
      const freqLabel = vitalsFrequencyNotifyLabel(freq);

      if (diff <= 0) {
        this.notify(
          'CRITICAL: Overdue',
          `${who}: control de signos (${freqLabel}) vencido.`
        );
      } else if (diff <= 15 * 60000) {
        this.notify(
          'Warning: Check Soon',
          `${who}: ventana (${freqLabel}) cierra en 15 min.`
        );
      }
    });
  }
}

export class ClientSessionInactivityLocker {
  /**
   * @param {number} [mins]
   * @param {string} [overlayId]
   */
  constructor(mins = 10, overlayId) {
    this.timeout = mins * 60000;
    this.el = typeof document !== 'undefined' && overlayId ? document.getElementById(overlayId) : null;
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
    }, this.timeout);
  }
}
