/**
 * One-shot: quita interpretaciones de labs auto-volcadas (labsText + entradas LABS/prosa/Estudios).
 * Eventualidades queda manual.
 */
import { normalizeEventualidadText } from './eventualidades-store.mjs';

var FLAG_KEY = 'rpc-strip-auto-lab-ev-v1';

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isAutoLabInterpretationText(text) {
  var t = normalizeEventualidadText(text);
  if (!t) return false;
  if (/^LABS\s+\d{1,2}\/\d{1,2}/.test(t)) return true;
  if (/EN LA (BIOMETR|QU[IÍ]MICA|GASOMETR)/.test(t)) return true;
  if (/EN LABORATORIO SE REGISTRAN/.test(t)) return true;
  // Volcado Estudios (BH/QS/GASES + valores)
  if (
    /\b(BH|QS|ESC|PFHS?|GASES|COAG)\b/.test(t) &&
    /\b(HB|HTO|PH|PCO2|GLU|CR|NA|K|ALB|TP|INR)\s*-?\d/.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {{ entries?: object[], labsText?: string, deletedIds?: Record<string, string>, updatedAt?: string }|null|undefined} store
 * @returns {{ store: object, changed: boolean, removedEntries: number, clearedLabsText: boolean }}
 */
export function stripAutoLabInterpretationsFromStore(store) {
  var entries = Array.isArray(store && store.entries) ? store.entries.slice() : [];
  var labsText =
    store && store.labsText != null ? normalizeEventualidadText(store.labsText) : '';
  var clearedLabsText = !!labsText;
  var kept = [];
  var removed = [];
  entries.forEach(function (e) {
    if (!e) return;
    if (isAutoLabInterpretationText(e.text)) {
      removed.push(e);
      return;
    }
    kept.push(e);
  });
  var changed = clearedLabsText || removed.length > 0;
  if (!changed) {
    return {
      store: store && typeof store === 'object' ? store : { entries: [], labsText: '' },
      changed: false,
      removedEntries: 0,
      clearedLabsText: false,
    };
  }
  /** @type {{ entries: object[], labsText: string, deletedIds?: Record<string, string>, updatedAt: string }} */
  var next = {
    entries: kept,
    labsText: '',
    updatedAt: new Date().toISOString(),
  };
  var deletedIds =
    store && store.deletedIds && typeof store.deletedIds === 'object'
      ? Object.assign({}, store.deletedIds)
      : {};
  var now = next.updatedAt;
  removed.forEach(function (e) {
    var id = e && e.id != null ? String(e.id) : '';
    if (id) deletedIds[id] = now;
  });
  if (Object.keys(deletedIds).length) next.deletedIds = deletedIds;
  return {
    store: next,
    changed: true,
    removedEntries: removed.length,
    clearedLabsText: clearedLabsText,
  };
}

/**
 * @param {object[]} patients
 * @returns {{ patientsChanged: number, entriesRemoved: number, labsTextCleared: number }}
 */
export function stripAutoLabInterpretationsFromPatients(patients) {
  var patientsChanged = 0;
  var entriesRemoved = 0;
  var labsTextCleared = 0;
  (patients || []).forEach(function (p) {
    if (!p || typeof p !== 'object' || !p.eventualidades) return;
    var out = stripAutoLabInterpretationsFromStore(p.eventualidades);
    if (!out.changed) return;
    p.eventualidades = out.store;
    patientsChanged += 1;
    entriesRemoved += out.removedEntries;
    if (out.clearedLabsText) labsTextCleared += 1;
  });
  return {
    patientsChanged: patientsChanged,
    entriesRemoved: entriesRemoved,
    labsTextCleared: labsTextCleared,
  };
}

/**
 * @returns {boolean} true if flag says already done
 */
export function hasStrippedAutoLabInterpretations() {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function markStrippedAutoLabInterpretations() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FLAG_KEY, '1');
  } catch (e) {
    console.warn('[eventualidades-strip-auto-labs] failed to write ' + FLAG_KEY, e);
  }
}

/**
 * One-shot on boot: strip auto lab dumps from all in-memory patients.
 * @param {object[]} patients
 * @returns {{ ran: boolean, patientsChanged: number, entriesRemoved: number, labsTextCleared: number }}
 */
export function maybeStripAutoLabInterpretationsOnce(patients) {
  if (hasStrippedAutoLabInterpretations()) {
    return { ran: false, patientsChanged: 0, entriesRemoved: 0, labsTextCleared: 0 };
  }
  var stats = stripAutoLabInterpretationsFromPatients(patients);
  markStrippedAutoLabInterpretations();
  return {
    ran: true,
    patientsChanged: stats.patientsChanged,
    entriesRemoved: stats.entriesRemoved,
    labsTextCleared: stats.labsTextCleared,
  };
}

export { FLAG_KEY as STRIP_AUTO_LAB_EV_FLAG };
