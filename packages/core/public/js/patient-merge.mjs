/** Merge de expedientes (entradas paciente) para sync Nube — unión sin borrar locales. */

import { compareIso } from './live-sync-room.mjs';
import { emptyEstadoClinico } from './features/estado-actual-data.mjs';
import { hasPendingEaProposals } from './features/estado-actual-meds.mjs';
import { mergeEventualidades } from './patient-merge-eventualidades.mjs';
import { stripDuplicateLabSets } from './lab-history-auto-store-core.mjs';
import { looksLikeSomeLabReport } from './labs-report-refs.mjs';

export { mergeEventualidades };

function parseDateDMY(value) {
  const t = String(value || '').trim();
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? null : d;
}

function docTimestamp(fecha, hora) {
  const d = parseDateDMY(fecha);
  if (!d) return '';
  const hm = String(hora || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (hm) d.setHours(parseInt(hm[1], 10), parseInt(hm[2], 10), 0, 0);
  return d.toISOString();
}

/** @param {object} set */
export function labSetTimestamp(set) {
  if (!set) return '';
  if (set.updatedAt) return String(set.updatedAt);
  const n = Number(set.id);
  if (!isNaN(n) && n > 1e11) return new Date(n).toISOString();
  return docTimestamp(set.fecha, set.hora);
}

/**
 * Nota / indicaciones edit clock. Always moves forward (two saves in one ms still differ),
 * so last-write-wins by `updatedAt` can order them. Returns the doc for chaining.
 * @param {Record<string, unknown>} doc
 */
export function stampDocUpdatedAt(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const prev = Date.parse(String(doc.updatedAt || ''));
  const now = Date.now();
  doc.updatedAt = new Date(Number.isFinite(prev) && prev >= now ? prev + 1 : now).toISOString();
  return doc;
}

export const DOC_ANTERIORES_MAX = 30;

/** One copy per fecha (a copy without fecha is keyed by the day it was saved). */
export function anteriorKey(s) {
  return String(s.fecha || String(s.guardada || '').slice(0, 10));
}

/** Copies the user can see: a deleted copy stays as a tombstone (`eliminada`) so sync cannot bring it back. */
export function liveAnteriores(doc) {
  return (Array.isArray(doc?.anteriores) ? doc.anteriores : []).filter((s) => s && !s.eliminada);
}

/** A `guardada` that always moves forward, so an edit or delete beats the older copy on another device. */
function nextGuardada(prev) {
  const p = Date.parse(String(prev || ''));
  const now = Date.now();
  return new Date(Number.isFinite(p) && p >= now ? p + 1 : now).toISOString();
}

/**
 * Edit one past copy in place. `fecha`/`hora` stay; `guardada` moves forward. False when no live copy has that key.
 * @param {Record<string, any>} doc @param {string} key @param {Record<string, unknown>} patch
 */
export function editAnterior(doc, key, patch) {
  const i = (doc?.anteriores || []).findIndex((s) => s && !s.eliminada && anteriorKey(s) === key);
  if (i < 0) return false;
  const cur = doc.anteriores[i];
  doc.anteriores[i] = { ...cur, ...patch, fecha: cur.fecha, hora: cur.hora, guardada: nextGuardada(cur.guardada) };
  return true;
}

/**
 * Delete one past copy: it becomes a tombstone that wins the union on every device. False when no live copy has that key.
 * @param {Record<string, any>} doc @param {string} key
 */
export function deleteAnterior(doc, key) {
  const i = (doc?.anteriores || []).findIndex((s) => s && !s.eliminada && anteriorKey(s) === key);
  if (i < 0) return false;
  doc.anteriores[i] = { fecha: key, guardada: nextGuardada(doc.anteriores[i].guardada), eliminada: true };
  return true;
}

/**
 * Union two `anteriores` lists (read-only copies of past exports) on fecha. The newest
 * `guardada` wins per fecha; newest first; capped. Never drops a copy only one side has.
 * @param {unknown} a @param {unknown} b
 * @returns {Record<string, unknown>[]}
 */
export function mergeAnteriores(a, b) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byDay = new Map();
  for (const s of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (!s || typeof s !== 'object') continue;
    const day = anteriorKey(s);
    const cur = byDay.get(day);
    if (!cur || compareIso(String(s.guardada || ''), String(cur.guardada || '')) > 0) byDay.set(day, s);
  }
  return [...byDay.values()]
    .sort((x, y) => compareIso(String(y.guardada || ''), String(x.guardada || '')))
    .slice(0, DOC_ANTERIORES_MAX);
}

/**
 * The winning nota / indicaciones keeps `anteriores` from the losing copy too, so a partial
 * or older payload never erases them. Returns `winner` itself when neither side has any.
 * @param {Record<string, unknown>} winner @param {unknown} other
 */
export function withMergedAnteriores(winner, other) {
  const o = other && typeof other === 'object' ? /** @type {Record<string, unknown>} */ (other) : null;
  const merged = mergeAnteriores(winner?.anteriores, o?.anteriores);
  return merged.length ? { ...winner, anteriores: merged } : winner;
}

/**
 * Last write wins for a pulled nota / indicaciones. Only when BOTH sides carry a real
 * `updatedAt`; a side without one (older build, LAN peer) keeps the old "incoming replaces".
 * A tie takes the incoming (server) copy.
 * @param {unknown} local @param {unknown} incoming
 */
export function incomingDocWinsLww(local, incoming) {
  const l = local && typeof local === 'object' ? String(local.updatedAt || '') : '';
  const r = incoming && typeof incoming === 'object' ? String(incoming.updatedAt || '') : '';
  if (!l || !r) return true;
  return compareIso(r, l) >= 0;
}

/**
 * Timestamp más reciente del bloque Estado actual / monitoreo para sync LWW (historial + texto guardado).
 * @param {unknown} monitoreo
 */
function bestRecordedAtFromHistorial(hist, best) {
  let max = best;
  for (let i = 0; i < hist.length; i += 1) {
    const row = hist[i];
    if (!row || typeof row !== 'object') continue;
    // savedAt is the real save-time clock; recordedAt is the user-chosen clinical
    // time (minute precision, editable) and ties too easily across rapid entries —
    // an LWW tie is broken by actorId, so one instance would always lose forever.
    const ra =
      /** @type {any} */ (row).savedAt != null
        ? String(/** @type {any} */ (row).savedAt)
        : /** @type {any} */ (row).recordedAt != null
          ? String(/** @type {any} */ (row).recordedAt)
          : '';
    // Must scan all rows — historial is oldest-first; early return picked the oldest clock
    // and Nube LWW rejected later client signos as stale.
    if (ra && compareIso(ra, max) > 0) max = ra;
  }
  return max;
}

export function monitoreoUpdatedAt(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return '';
  let best = '';
  /** @type {any} */
  const m = monitoreo;
  const ecAt =
    m.estadoClinicoUpdatedAt != null && String(m.estadoClinicoUpdatedAt).trim()
      ? String(m.estadoClinicoUpdatedAt)
      : '';
  if (ecAt) best = ecAt;
  const tg = m.textoGuardado && typeof m.textoGuardado === 'object' ? m.textoGuardado : null;
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) {
    const saved = String(tg.savedAt);
    if (compareIso(saved, best) > 0) best = saved;
  }
  const hist = Array.isArray(m.historial) ? m.historial : [];
  return bestRecordedAtFromHistorial(hist, best);
}

function estadoClinicoHasContent(ec) {
  const template = emptyEstadoClinico();
  for (const key of Object.keys(template)) {
    if (String(ec[key] || '').trim()) return true;
  }
  return false;
}

function confirmadoHasContent(conf) {
  for (const key of Object.keys(conf)) {
    if (conf[key]) return true;
  }
  return false;
}

function monitoreoTextoGuardadoHasPayload(tg) {
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) return true;
  return !!String(tg?.text || '').trim();
}

/** @param {unknown} monitoreo */
export function monitoreoHasLanPayload(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return false;
  return monitoreoHasHistorialOrText(monitoreo) || monitoreoHasClinicalFlags(monitoreo);
}

function monitoreoHasHistorialOrText(monitoreo) {
  /** @type {any} */
  const m = monitoreo;
  if (Array.isArray(m.historial) && m.historial.length > 0) return true;
  const tg = m.textoGuardado && typeof m.textoGuardado === 'object' ? m.textoGuardado : null;
  return !!(tg && monitoreoTextoGuardadoHasPayload(tg));
}

function monitoreoHasClinicalFlags(monitoreo) {
  /** @type {any} */
  const m = monitoreo;
  const ec = m.estadoClinico && typeof m.estadoClinico === 'object' ? m.estadoClinico : null;
  if (ec && estadoClinicoHasContent(ec)) return true;
  if (hasPendingEaProposals(m.pendienteReceta)) return true;
  const conf = m.confirmado && typeof m.confirmado === 'object' ? m.confirmado : null;
  return !!(conf && confirmadoHasContent(conf));
}

function labSetHasSomeSource(set) {
  return looksLikeSomeLabReport(String((set && set.sourceText) || ''));
}

function pickSomeSourceText(a, b) {
  const as = labSetHasSomeSource(a) ? String(a.sourceText || '') : '';
  const bs = labSetHasSomeSource(b) ? String(b.sourceText || '') : '';
  if (as && bs) {
    return compareIso(labSetTimestamp(b), labSetTimestamp(a)) >= 0 ? bs : as;
  }
  return as || bs;
}

/** LWW by timestamp, but a SOME report always beats parsed-only Nube values. */
function mergeLabSetPreferSome(cur, incoming) {
  if (!cur) return { ...incoming };
  const incomingNewer = compareIso(labSetTimestamp(incoming), labSetTimestamp(cur)) >= 0;
  const newer = incomingNewer ? incoming : cur;
  const older = incomingNewer ? cur : incoming;
  const out = { ...newer };
  const src = pickSomeSourceText(cur, incoming);
  if (!src) return out;
  out.sourceText = src;
  if (!labSetHasSomeSource(newer) && labSetHasSomeSource(older)) {
    if (Array.isArray(older.resLabs)) out.resLabs = older.resLabs;
    if (older.bhExtras) out.bhExtras = older.bhExtras;
  }
  return out;
}

/** @param {object[]} a @param {object[]} b */
export function mergeLabHistorySets(a, b) {
  const map = new Map();
  for (const s of a || []) {
    if (!s || !s.id) continue;
    map.set(String(s.id), { ...s });
  }
  for (const s of b || []) {
    if (!s || !s.id) continue;
    const id = String(s.id);
    const cur = map.get(id);
    map.set(id, mergeLabSetPreferSome(cur, s));
  }
  return stripDuplicateLabSets(Array.from(map.values())).sets;
}
