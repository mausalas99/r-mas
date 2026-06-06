/**
 * Guardia vitals feed — shows the most recent vitals registered by interno
 * for each patient during the active shift.
 */
import { abbreviatePatientName } from '../../../lib/interno/interno-board.mjs';

const ALERT_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const VITALS_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;

/**
 * @param {Date|string|null|undefined} ts
 * @returns {string}
 */
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return 'ahora';
  if (diff < 60) return `hace ${diff} min`;
  const h = Math.floor(diff / 60);
  return `hace ${h}h`;
}

/**
 * @param {{ alteredAt?: Record<string, unknown> }} entry
 * @returns {boolean}
 */
function entryHasAlerts(entry) {
  return !!(entry?.alteredAt && Object.keys(entry.alteredAt).length > 0);
}

/**
 * Format a vital value, wrapping altered values in an alert span.
 * @param {string} key
 * @param {unknown} value
 * @param {Record<string, unknown>} [alteredAt]
 * @returns {string}
 */
function fmtVal(key, value, alteredAt = {}) {
  const v = value != null ? String(value) : '—';
  if (alteredAt[key]) return `<span class="vfeed-altered">${v}</span>`;
  return v;
}

/**
 * Build the vitals text line from a monitoreo historial entry.
 * @param {{ values?: Record<string, unknown>, alteredAt?: Record<string, unknown> }} entry
 * @returns {string}
 */
function buildVitalsLine(entry) {
  const v = entry?.values || {};
  const alt = entry?.alteredAt || {};
  const parts = [];
  if (v.ta != null) parts.push(`TA ${fmtVal('ta', v.ta, alt)}`);
  if (v.fc != null) parts.push(`FC ${fmtVal('fc', v.fc, alt)}`);
  if (v.fr != null) parts.push(`FR ${fmtVal('fr', v.fr, alt)}`);
  if (v.temp != null) parts.push(`Temp ${fmtVal('temp', v.temp, alt)}`);
  if (v.sat != null) parts.push(`Sat ${fmtVal('sat', v.sat, alt)}%`);
  if (v.glu != null) parts.push(`Glu ${fmtVal('glu', v.glu, alt)}`);
  return parts.join(' · ') || '—';
}

/**
 * @param {Array<{ id: string, name?: string, bed_label?: string, monitoreo?: { historial?: Array<{ values?: object, alteredAt?: object, registeredAt?: string }> } }>} patients
 * @returns {Array<{ id: string, bed: string, name: string, line: string, hasAlerts: boolean, registeredAt: string|null }>}
 */
function collectRecentVitals(patients) {
  return patients
    .map((p) => {
      const hist = Array.isArray(p.monitoreo?.historial) ? p.monitoreo.historial : [];
      if (!hist.length) return null;
      const last = hist[hist.length - 1];
      return {
        id: p.id,
        bed: String(p.bed_label || '—'),
        name: abbreviatePatientName(String(p.name || '')),
        line: buildVitalsLine(last),
        hasAlerts: entryHasAlerts(last),
        registeredAt: String(last?.registeredAt || last?.createdAt || ''),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Alerts first, then by recency
      if (a.hasAlerts !== b.hasAlerts) return a.hasAlerts ? -1 : 1;
      return (b.registeredAt || '').localeCompare(a.registeredAt || '');
    });
}

/**
 * Render the vitals feed into `#guardia-vitals-feed`.
 * Call this whenever `renderGuardiaBoard` runs.
 * @param {Array<object>} patients — same patient list used for the census
 */
export function renderGuardiaVitalsFeed(patients) {
  const host = document.getElementById('guardia-vitals-feed');
  if (!host) return;

  const items = collectRecentVitals(patients);

  if (!items.length) {
    host.innerHTML = `
      <div class="vfeed-empty">
        ${VITALS_SVG}
        <span>Sin signos registrados en este turno</span>
      </div>`;
    return;
  }

  const cards = items.map((item) => `
    <div class="vfeed-card${item.hasAlerts ? ' vfeed-card--alert' : ''}" data-patient-id="${item.id}">
      <div class="vfeed-card-head">
        <span class="vfeed-bed">Cama ${item.bed}</span>
        ${item.hasAlerts ? `<span class="vfeed-alert-icon">${ALERT_SVG}</span>` : ''}
        <span class="vfeed-time">${timeAgo(item.registeredAt)}</span>
      </div>
      <div class="vfeed-name">${item.name}</div>
      <div class="vfeed-vals">${item.line}</div>
    </div>`).join('');

  host.innerHTML = `
    <div class="vfeed-header">
      ${VITALS_SVG}
      <span class="vfeed-title">Signos vitales</span>
      <span class="vfeed-live-dot" aria-hidden="true"></span>
    </div>
    <div class="vfeed-cards">${cards}</div>`;
}
