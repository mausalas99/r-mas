/**
 * Field-change primitives for `patient.cardio` state, targeted via a
 * `[data-ea-cardio]` / `[data-ea-cardio-override]` / `[data-ea-cardio-pocus]`
 * attribute set (parallel to `estado-actual-panel-clinico-fields.mjs`'s
 * `[data-ea-ec]` ones, so the two never collide). Called directly by the
 * card modal wire functions in `estado-actual-panel-clinico.mjs` (Descongestión
 * card) and by `estado-actual-congestion-modal.mjs` (Congestión/POCUS card) —
 * kept framework-agnostic and unit-testable, no DOM-sweeping here.
 */
import { applyAcumuladoOverride, clearAcumuladoOverride } from '../../../../lib/cardio/descongestion.mjs';
import { upsertPocusDay, emptyCongestionChecklist, emptyLungZones, LUNG_ZONE_KEYS } from '../../../../lib/cardio/congestion.mjs';
import { upsertScoreEntry } from '../../../../lib/cardio/hf-scores.mjs';

var POCUS_CHECKLIST_KEYS = ['pvy', 'rhy', 'soplo', 'estertores', 'ascitisHepatomegalia', 'edemaMi'];
var POCUS_DAY_KEYS = ['date', 'vciCm', 'vciCollapse', 'vexus', 'fevi', 'congestionScore', 'lungPattern', 'lungLinesB', 'stevenson', 'note'];
// Read from the POCUS form but written to `patient.cardio.scores` (hf-scores.mjs),
// not stored on the pocusByDay day record itself — see saveCardioPocusDay.
var POCUS_SCORE_KEYS = ['sixMwtMeters'];

/**
 * @param {string} raw 'true' | 'false' | ''
 * @returns {boolean | null}
 */
function parseTriState(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

/**
 * @param {HTMLElement} el
 * @param {{ cardio?: Record<string, any> }} patient
 * @param {() => void} persist
 * @param {(opts: { refresh?: boolean }) => void} onChange
 */
export function applyCardioFieldChange(el, patient, persist, onChange) {
  if (!patient || !patient.cardio) return;
  var key = el.getAttribute('data-ea-cardio');
  if (!key) return;
  var val = 'value' in el ? String(el.value) : '';
  if (String(patient.cardio[key] || '') === val) return;
  patient.cardio[key] = val;
  persist();
  onChange({ refresh: key === 'inicioDescongestion' });
}

/**
 * @param {HTMLElement} el
 * @param {{ cardio?: Record<string, any> }} patient
 * @param {() => void} persist
 * @param {() => void} onChange
 */
export function applyCardioOverrideChange(el, patient, persist, onChange) {
  if (!patient || !patient.cardio) return;
  var key = el.getAttribute('data-ea-cardio-override');
  if (!key) return;
  var raw = 'value' in el ? String(el.value).trim() : '';
  var next = applyAcumuladoOverride(patient.cardio, key, raw === '' ? null : Number(raw));
  if (raw === '') {
    var cleared = clearAcumuladoOverride(patient.cardio, key);
    patient.cardio.overrides = cleared.overrides;
  } else {
    patient.cardio.overrides = next.overrides;
  }
  persist();
  onChange();
}

/**
 * Clears all descongestión override keys ("Recalcular").
 * @param {{ cardio?: Record<string, any> }} patient
 * @param {() => void} persist
 * @param {() => void} onChange
 */
export function recalcularCardioOverrides(patient, persist, onChange) {
  if (!patient || !patient.cardio) return;
  ['diuresisAcumuladaMl', 'furosemidaAcumuladaMg', 'balanceAcumuladoMl'].forEach(function (key) {
    var cleared = clearAcumuladoOverride(patient.cardio, key);
    patient.cardio.overrides = cleared.overrides;
  });
  persist();
  onChange();
}

/**
 * Reads the current POCUS draft form values out of the DOM into a record
 * shaped for `upsertPocusDay`.
 * @param {HTMLElement} mount
 * @returns {Record<string, unknown>}
 */
export function readPocusFormValues(mount) {
  var record = { checklist: emptyCongestionChecklist(), lungZones: emptyLungZones() };
  POCUS_DAY_KEYS.forEach(function (key) {
    var el = mount.querySelector('[data-ea-cardio-pocus="' + key + '"]');
    if (el && 'value' in el) record[key] = String(el.value);
  });
  POCUS_CHECKLIST_KEYS.forEach(function (key) {
    var el = mount.querySelector('[data-ea-cardio-pocus="' + key + '"]');
    if (el && 'value' in el) record.checklist[key] = parseTriState(String(el.value));
  });
  var llenado = mount.querySelector('[data-ea-cardio-pocus="llenadoCapilar"]');
  if (llenado && 'value' in llenado) record.checklist.llenadoCapilar = String(llenado.value);
  LUNG_ZONE_KEYS.forEach(function (key) {
    var el = mount.querySelector('[data-ea-cardio-pocus-zone="' + key + '"]');
    if (el && 'value' in el) record.lungZones[key] = String(el.value);
  });
  POCUS_SCORE_KEYS.forEach(function (key) {
    var el = mount.querySelector('[data-ea-cardio-pocus="' + key + '"]');
    if (el && 'value' in el) record[key] = String(el.value);
  });
  return record;
}

/**
 * Saves the current POCUS draft form as a day record on `patient.cardio.pocusByDay`.
 * Also writes the 6MWT reading (when entered) into `patient.cardio.scores` —
 * that's the canonical store for dated scores (hf-scores.mjs), shared with
 * the Consulta IC screen, not a new field on the POCUS day record.
 * @param {HTMLElement} mount
 * @param {{ cardio?: Record<string, any> }} patient
 * @param {() => void} persist
 * @param {() => void} onChange
 */
export function saveCardioPocusDay(mount, patient, persist, onChange) {
  if (!patient || !patient.cardio) return;
  var record = readPocusFormValues(mount);
  if (!record.date) return;
  patient.cardio.pocusByDay = upsertPocusDay(patient.cardio.pocusByDay, record);
  var sixMwt = String(record.sixMwtMeters || '').trim();
  if (sixMwt !== '' && Number.isFinite(Number(sixMwt))) {
    patient.cardio.scores = upsertScoreEntry(patient.cardio.scores, {
      date: record.date,
      sixMwtMeters: Number(sixMwt),
    });
  }
  persist();
  onChange();
}

