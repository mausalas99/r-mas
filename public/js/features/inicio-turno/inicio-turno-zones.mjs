/**
 * Inicio de turno (screen 12a) — "Tus zonas hoy" chip data + persistence.
 *
 * The mockup's example chips (N/V/HD/HI/NM) are the SOAP objective-by-system
 * sections used inside a single patient's nota de evolución
 * (lib/nota-evolucion/objetivo-derive.mjs) — they are NOT a ward/zone the app
 * assigns patients to. There is no bed-to-zone data model in R+. The one real,
 * already-existing per-patient location field that plays that role is `area`
 * (set on every patient via patients-modal-commit.mjs), so "zonas" here are the
 * distinct `area` values actually present in the census, each with its real bed
 * count — not the mockup's placeholder letters.
 *
 * Persistence follows the same localStorage read/write pattern already used for
 * other per-user census filters (clinical-census-filters-ui.mjs).
 */

export const INICIO_TURNO_ZONES_LS = 'rpc.inicioTurnoZonas';

/**
 * @param {object[]} patients
 * @returns {{ id: string, label: string, count: number }[]} sorted by label
 */
export function deriveZonesFromCensus(patients) {
  const counts = new Map();
  (patients || []).forEach((p) => {
    const zone = String(p?.area || '').trim();
    if (!zone) return;
    counts.set(zone, (counts.get(zone) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, label: id, count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/** @param {Storage|undefined} storage */
export function readInicioTurnoZonesPreference(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(INICIO_TURNO_ZONES_LS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x) : [];
  } catch (_e) {
    void _e;
    return [];
  }
}

/**
 * @param {string[]} zoneIds
 * @param {Storage|undefined} storage
 */
export function writeInicioTurnoZonesPreference(zoneIds, storage = globalThis.localStorage) {
  try {
    storage?.setItem(
      INICIO_TURNO_ZONES_LS,
      JSON.stringify(Array.isArray(zoneIds) ? zoneIds.filter((x) => typeof x === 'string' && x) : [])
    );
  } catch (_e) {
    void _e;
  }
}

/**
 * Footer note: "Ayer llevaste N y V. Guardamos tu última selección." — built
 * only from the persisted selection itself (no separate "yesterday" log
 * exists), so it reads as "last time" rather than fabricating a day boundary.
 * @param {string[]} previousZoneIds
 * @returns {string}
 */
export function zonesFooterNote(previousZoneIds) {
  const ids = Array.isArray(previousZoneIds) ? previousZoneIds.filter(Boolean) : [];
  if (!ids.length) return 'Elige las zonas que revisas tú. Se guardan para tu próximo turno.';
  return `La última vez llevaste ${ids.join(' y ')}. Guardamos tu selección entre turnos.`;
}
