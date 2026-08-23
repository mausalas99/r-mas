/**
 * `cardio.labSnapshots` — manual Previo/Actual lab table for HF forms.
 * Not a parallel labs pipeline: `prefillFromImportedLabs()` proposes values
 * from the generic imported-labs pipeline (`public/js/labs-panel-defs.mjs`,
 * `labs-glance-model.mjs`) and the user confirms/edits.
 */

export function emptyLabSnapshot() {
  return {
    date: '',
    values: {
      cr: null,
      tfge: null,
      peso: null,
      k: null,
      na: null,
      p: null,
      mg: null,
      alb: null,
      protTotales: null,
      bilTotal: null,
      bilDirecta: null,
      fa: null,
      ggt: null,
      ast: null,
      alt: null,
      ldh: null,
      colTotal: null,
      hdl: null,
      ldl: null,
      tg: null,
      protOrina: null,
      ntProBnp: null,
      troponina: null,
    },
  };
}

/**
 * Prefer explicit `next` when the key is present on `record`; otherwise keep `prev`.
 * @template T
 * @param {Record<string, unknown>} record
 * @param {string} key
 * @param {T} prevVal
 * @param {T} emptyVal
 * @returns {T}
 */
function coalesceField(record, key, prevVal, emptyVal) {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    const v = record[key];
    return /** @type {T} */ (v === undefined || v === null ? emptyVal : v);
  }
  return prevVal !== undefined && prevVal !== null ? prevVal : emptyVal;
}

export function upsertLabSnapshot(list, snap) {
  const date = String(snap.date || '').trim();
  const out = Array.isArray(list) ? list.slice() : [];
  const idx = out.findIndex((r) => r && r.date === date);
  const prev = idx >= 0 ? out[idx] : null;
  const defaults = emptyLabSnapshot();
  const nextValues = snap && typeof snap.values === 'object' ? snap.values : {};
  const prevValues = (prev && prev.values) || {};

  const values = {};
  for (const key of Object.keys(defaults.values)) {
    values[key] = coalesceField(nextValues, key, prevValues[key], defaults.values[key]);
  }

  const row = { date, values };
  if (idx >= 0) out[idx] = row;
  else out.push(row);
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

/**
 * Most recent two lab snapshots by date, for Previo/Actual rendering.
 * @param {any[]} list
 * @returns {{ previo: any|null, actual: any|null }}
 */
export function latestTwoSnapshots(list) {
  const sorted = (Array.isArray(list) ? list.slice() : []).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const n = sorted.length;
  return {
    actual: n >= 1 ? sorted[n - 1] : null,
    previo: n >= 2 ? sorted[n - 2] : null,
  };
}

// Confidently mapped from LAB_EXTENDED_PANEL_DEFS (public/js/labs-panel-defs.mjs,
// sectionKey 'CARD', field key 'NTproBNP', labels ['NT-PROBNP','NT PROBNP','NTproBNP']):
//   ntProBnp
// TODO (next phase, verify against real imported-lab payload shapes before mapping):
//   cr, tfge, peso, k, na, p, mg, alb, protTotales, bilTotal, bilDirecta, fa,
//   ggt, ast, alt, ldh, colTotal, hdl, ldl, tg, protOrina, troponina
// The core basic-chemistry panel (creatinina/electrolitos/hepáticas) is not
// exposed as stable keyed fields anywhere in the generic labs pipeline today —
// it lives in free-text row tokens (see labs-glance-model.mjs
// tokenStatsFromTokens/valuesByKey), so guessing a mapping risks silently
// wiring the wrong number into a clinical field. Left null on purpose.

const NT_PROBNP_KEYS = ['NT-PROBNP', 'NT PROBNP', 'NTPROBNP'];

/**
 * Propose a partial `values` object from whatever the generic imported-labs
 * pipeline can supply. `labHistory` is expected to expose a flat
 * label→value map (uppercased label keys), the same shape
 * `buildGroupsFromLabRows()`'s `valuesByKey` produces in
 * labs-glance-model.mjs. Unmapped/unconfident fields are left null rather
 * than guessed.
 * @param {{ valuesByKey?: Record<string, string> }|null} labHistory
 */
export function prefillFromImportedLabs(labHistory) {
  const out = {};
  const byKey = (labHistory && labHistory.valuesByKey) || {};
  const upperMap = {};
  for (const key of Object.keys(byKey)) {
    upperMap[key.toUpperCase()] = byKey[key];
  }

  let ntProBnp = null;
  for (const candidate of NT_PROBNP_KEYS) {
    const direct = upperMap[candidate];
    if (direct != null) {
      ntProBnp = direct;
      break;
    }
    const suffixed = Object.keys(upperMap).find((k) => k.endsWith('|' + candidate));
    if (suffixed) {
      ntProBnp = upperMap[suffixed];
      break;
    }
  }
  out.ntProBnp = ntProBnp;

  return out;
}
