/** Merge LWW de eventualidades (entradas + labsText + deletedIds) para sync LAN/Nube. */

import { compareIso } from './live-sync-room.mjs';
import { filterNewEventualidades, dedupeEventualidadKey } from '../../lib/drive-import/merge-eventualidades.mjs';

/** @param {unknown} store */
export function eventualidadesUpdatedAt(store) {
  if (!store || typeof store !== 'object') return '';
  /** @type {{ entries?: object[], updatedAt?: string }} */
  const s = store;
  let best = s.updatedAt ? String(s.updatedAt) : '';
  const entries = Array.isArray(s.entries) ? s.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    const row = entries[i];
    if (!row || typeof row !== 'object') continue;
    const at = String(
      /** @type {{ at?: string, updatedAt?: string }} */ (row).at ||
        /** @type {{ updatedAt?: string }} */ (row).updatedAt ||
        ''
    );
    if (compareIso(at, best) > 0) best = at;
  }
  return best;
}

function mergeEventualidadRow(byId, row) {
  if (!row || typeof row !== 'object') return;
  const id = String(/** @type {{ id?: string }} */ (row).id || '').trim();
  if (!id) return;
  const cur = byId.get(id);
  const at = String(/** @type {{ at?: string }} */ (row).at || '');
  const curAt = cur ? String(/** @type {{ at?: string }} */ (cur).at || '') : '';
  if (!cur || compareIso(at, curAt) >= 0) byId.set(id, { ...row });
}

function appendAnonymousEventualidades(byId, leftEntries, rightEntries) {
  const { toAdd } = filterNewEventualidades(
    Array.from(byId.values()),
    rightEntries.filter((row) => !String(/** @type {{ id?: string }} */ (row).id || '').trim())
  );
  for (const row of toAdd) {
    byId.set('anon:' + dedupeEventualidadKey(row), { ...row });
  }
}

/** @param {unknown} a @param {unknown} b */
function mergeEventualidadesLabsText(a, b) {
  const la = a != null ? String(a).trim() : '';
  const lb = b != null ? String(b).trim() : '';
  if (!la) return lb;
  if (!lb) return la;
  if (la === lb || la.indexOf(lb) >= 0) return la;
  if (lb.indexOf(la) >= 0) return lb;
  return la.length >= lb.length ? la : lb;
}

/** @param {unknown} a @param {unknown} b @returns {Record<string, string>} */
function mergeEventualidadDeletedIds(a, b) {
  /** @type {Record<string, string>} */
  const out = {};
  const left = a && typeof a === 'object' ? /** @type {Record<string, unknown>} */ (a) : {};
  const right = b && typeof b === 'object' ? /** @type {Record<string, unknown>} */ (b) : {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const id = String(key || '').trim();
    if (!id) continue;
    const la = String(left[id] || '');
    const ra = String(right[id] || '');
    if (!la && !ra) continue;
    out[id] = compareIso(ra, la) >= 0 ? ra || la : la;
  }
  return out;
}

/** @param {unknown} value */
function asEventualidadesSide(value) {
  if (!value || typeof value !== 'object') return null;
  return /** @type {{ entries?: object[], labsText?: string, deletedIds?: Record<string, string>, updatedAt?: string }} */ (
    value
  );
}

/** @param {unknown} side */
function eventualidadesEntriesOf(side) {
  return side && Array.isArray(side.entries) ? side.entries : [];
}

/** @param {Map<string, object>} byId @param {Record<string, string>} deletedIds */
function finalizeEventualidadEntries(byId, deletedIds) {
  return Array.from(byId.values())
    .filter(function (row) {
      const id = String(/** @type {{ id?: string }} */ (row).id || '').trim();
      return !id || !deletedIds[id];
    })
    .sort(function (x, y) {
      return compareIso(
        String(/** @type {{ at?: string }} */ (y).at || ''),
        String(/** @type {{ at?: string }} */ (x).at || '')
      );
    });
}

/** @param {string} leftAt @param {string} rightAt */
function newerIsoClock(leftAt, rightAt) {
  return compareIso(rightAt, leftAt) >= 0 ? rightAt || leftAt : leftAt;
}

/** @param {ReturnType<typeof asEventualidadesSide>} left @param {ReturnType<typeof asEventualidadesSide>} right */
function buildMergedEventualidadesStore(left, right) {
  const leftEntries = eventualidadesEntriesOf(left);
  const rightEntries = eventualidadesEntriesOf(right);
  const byId = new Map();
  for (const row of leftEntries) mergeEventualidadRow(byId, row);
  for (const row of rightEntries) mergeEventualidadRow(byId, row);
  appendAnonymousEventualidades(byId, leftEntries, rightEntries);
  const deletedIds = mergeEventualidadDeletedIds(left && left.deletedIds, right && right.deletedIds);
  const entries = finalizeEventualidadEntries(byId, deletedIds);
  const labsText = mergeEventualidadesLabsText(left && left.labsText, right && right.labsText);
  /** @type {{ entries: object[], labsText?: string, deletedIds?: Record<string, string>, updatedAt?: string }} */
  const out = labsText ? { entries: entries, labsText: labsText } : { entries: entries };
  if (Object.keys(deletedIds).length) out.deletedIds = deletedIds;
  const updatedAt = newerIsoClock(
    left && left.updatedAt ? String(left.updatedAt) : '',
    right && right.updatedAt ? String(right.updatedAt) : ''
  );
  if (updatedAt) out.updatedAt = updatedAt;
  return out;
}

export function mergeEventualidades(a, b) {
  const left = asEventualidadesSide(a);
  const right = asEventualidadesSide(b);
  if (!left && !right) return undefined;
  return buildMergedEventualidadesStore(left, right);
}
