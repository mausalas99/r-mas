/** Shared LAN directory activity helpers (Node + renderer). */

export const CLINICAL_USER_ACTIVITY_ACTIVE_MS = 24 * 60 * 60 * 1000;
export const CLINICAL_USER_ACTIVITY_RECENT_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 * @returns {string|null}
 */
export function mergeLastActivityIso(a, b) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  if (!left) return right || null;
  if (!right) return left;
  return left >= right ? left : right;
}

/**
 * @param {string|null|undefined} iso
 * @param {number} [nowMs]
 * @returns {'active'|'recent'|'stale'|'unknown'}
 */
export function clinicalUserActivityTier(iso, nowMs = Date.now()) {
  const raw = String(iso || '').trim();
  if (!raw) return 'unknown';
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts)) return 'unknown';
  const age = nowMs - ts;
  if (age < 0) return 'active';
  if (age <= CLINICAL_USER_ACTIVITY_ACTIVE_MS) return 'active';
  if (age <= CLINICAL_USER_ACTIVITY_RECENT_MS) return 'recent';
  return 'stale';
}

/**
 * Absolute last-activity datetime for admin disambiguation (es-MX).
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatClinicalUserActivityAbsolute(iso) {
  const raw = String(iso || '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return raw;
  }
}

/**
 * Relative last-activity label (not a 24h "Activo" badge).
 * @param {string|null|undefined} iso
 * @param {number} [nowMs]
 * @returns {string}
 */
export function formatClinicalUserLastActivity(iso, nowMs = Date.now()) {
  const tier = clinicalUserActivityTier(iso, nowMs);
  if (tier === 'unknown') return 'Sin actividad registrada';
  const ts = new Date(String(iso)).getTime();
  const diffMin = Math.floor((nowMs - ts) / 60000);
  if (diffMin < 1) return 'Última: ahora';
  if (diffMin < 60) return `Última: hace ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) {
    const mins = diffMin % 60;
    return mins ? `Última: hace ${hours} h ${mins} min` : `Última: hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Última: ayer';
  if (days < 7) return `Última: hace ${days} d`;
  return `Última: hace ${days} d`;
}

/**
 * Badge text: relative + absolute datetime so admins can pick the real account.
 * @param {string|null|undefined} iso
 * @param {number} [nowMs]
 * @returns {string}
 */
export function formatClinicalUserActivityBadge(iso, nowMs = Date.now()) {
  const relative = formatClinicalUserLastActivity(iso, nowMs);
  const abs = formatClinicalUserActivityAbsolute(iso);
  if (!abs) return relative;
  return `${relative} · ${abs}`;
}

/** @param {'active'|'recent'|'stale'|'unknown'} tier */
export function clinicalUserActivityLabel(tier) {
  if (tier === 'active') return 'Hoy';
  if (tier === 'recent') return '7 d';
  if (tier === 'stale') return 'Antigua';
  return 'Sin registro';
}

/** @param {string} source */
export function clinicalUserActivitySourceLabel(source) {
  const s = String(source || '').trim();
  if (s === 'seed_created' || s === 'created') return 'Creado';
  if (s === 'seed_last') return 'Histórico';
  if (s === 'session') return 'Sesión';
  if (s === 'save') return 'Guardado';
  if (s === 'claim') return 'Registro';
  if (s === 'sync') return 'Sync';
  return s || 'Uso';
}

/**
 * Chronological activity entries for admin Equipos (oldest → newest for reading).
 * @param {Array<{ at?: string, source?: string }>|null|undefined} history
 * @param {number} [maxPoints]
 * @returns {{ entries: Array<{ at: string, source: string, atLabel: string }>, total: number, more: number }}
 */
export function clinicalUserActivityHistoryEntries(history, maxPoints = 8) {
  const list = Array.isArray(history) ? history.slice() : [];
  if (!list.length) return { entries: [], total: 0, more: 0 };
  const max = Math.max(1, Number(maxPoints) || 8);
  // history arrives newest-first; show oldest→newest for timeline reading
  const entries = list
    .slice(0, max)
    .reverse()
    .map((ev) => ({
      at: String(ev?.at || '').trim(),
      source: clinicalUserActivitySourceLabel(ev?.source || ''),
      atLabel: formatClinicalUserActivityAbsolute(ev?.at),
    }))
    .filter((ev) => ev.atLabel || ev.source);
  return {
    entries,
    total: list.length,
    more: Math.max(0, list.length - max),
  };
}

/**
 * Compact chronological history for admin Equipos (oldest → newest for reading).
 * @param {Array<{ at?: string, source?: string }>|null|undefined} history
 * @param {number} [maxPoints]
 * @returns {string}
 */
export function formatClinicalUserActivityHistory(history, maxPoints = 8) {
  const { entries, more } = clinicalUserActivityHistoryEntries(history, maxPoints);
  if (!entries.length) return '';
  const points = entries.map((ev) => {
    if (!ev.atLabel) return ev.source;
    return ev.source + ' ' + ev.atLabel;
  });
  const suffix = more > 0 ? ' · +' + more : '';
  return 'Historial: ' + points.join(' · ') + suffix;
}
