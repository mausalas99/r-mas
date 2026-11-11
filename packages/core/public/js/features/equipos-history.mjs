/**
 * Equipos custody history (sessions) for R4/Admin in Modo Guardia.
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { DEVICE_LABELS } from '../../equipos/equipos-rotaciones.mjs';
import { equiposCloudFetch, getEquiposCloudConfig } from '../equipos-cloud-config.mjs';

const CLOSED_LABELS = {
  return: 'Devolución',
  admin_purge: 'Purgado',
  admin_force_return: 'Forzado',
};

function dbApi() {
  return window.rplusDb || window.electronAPI || null;
}

/** @param {string} [iso] */
function fmtWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/** @param {number|null|undefined} sec */
function fmtDuration(sec) {
  if (sec == null || Number.isNaN(sec)) return '—';
  const n = Math.max(0, Math.floor(sec));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return '< 1 min';
}

/** @param {object} row */
function sessionStatus(row) {
  if (!row.returned_at) return 'En curso';
  return CLOSED_LABELS[row.closed_reason] || 'Cerrado';
}

async function fetchEquiposReports() {
  const cloud = getEquiposCloudConfig();
  if (cloud.enabled) {
    const res = await equiposCloudFetch('/reports');
    return { sessions: res.sessions || [], reports: res.reports || [] };
  }
  const api = dbApi();
  const user = clinicalSessionContext.user || {};
  if (!api?.dbEquiposReports) throw new Error('Base de equipos no disponible.');
  const res = await api.dbEquiposReports({ userId: user.user_id });
  return { sessions: res.sessions || [], reports: res.reports || [] };
}

/** The table's rows as plain text. @param {object[]} sessions */
export function sessionRows(sessions) {
  return sessions.map((s) => ({
    device: DEVICE_LABELS[s.device_type] || s.device_type,
    holder: s.holder_name,
    rotation: s.holder_rotation,
    out: fmtWhen(s.checked_out_at),
    back: fmtWhen(s.returned_at),
    duration: fmtDuration(s.duration_seconds),
    status: sessionStatus(s),
  }));
}

/**
 * @param {HTMLElement} host
 * @param {(msg: string, kind?: string) => void} [showToast]
 */
export async function loadEquiposHistoryPanel(host, showToast) {
  if (!host) return;
  host.hidden = false;
  const view = await import('./equipos-history-view.jsx');
  view.drawHistoryLoading(host);
  try {
    const { sessions } = await fetchEquiposReports();
    view.drawHistoryPanel(host, sessionRows(sessions));
    host.querySelector('[data-eq-history-close]')?.addEventListener('click', () => {
      host.hidden = true;
      view.clearHistory(host);
    });
  } catch (e) {
    view.drawHistoryError(host, e.message || 'No se pudo cargar el historial.');
    showToast?.(e.message || 'Error al cargar historial.', 'error');
  }
}
