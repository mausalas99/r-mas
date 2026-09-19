/**
 * `cardio.consultas` — one record per outpatient HF follow-up visit
 * (Consulta Externa). `fenotipo`/`etiologia`/`ritmo` here are per-visit
 * SNAPSHOTS, not live references to the top-level `cardio` fields — a
 * patient's fenotipo can change over time (e.g. HFimpEF after recovery) and
 * each visit should preserve what was true at that visit.
 */

/** Subjetivo checklist (patient-reported HF symptoms, severity-graded) —
 * replaces the old free-text `subjetivo` narrative. A pre-existing entry
 * whose `subjetivo` is still a plain string (legacy data) is left untouched
 * by `upsertConsultaEntry` until the caller sends a structured patch; see
 * that function's `mergeNarrativeObject` for the read-only-until-edited
 * fallback. */
export function emptySubjetivo() {
  return {
    disneaEsfuerzo: '',
    disneaReposo: '',
    ortopnea: '',
    edema: '',
    fatiga: '',
    palpitaciones: '',
    nota: '',
  };
}

/** Objetivo checklist (exam findings as toggles) — replaces the old
 * free-text `objetivo` narrative. Same legacy-string fallback as
 * `emptySubjetivo`. */
export function emptyObjetivo() {
  return {
    ingurgitacionYugular: null,
    ruidosCardiacos: '',
    estertores: null,
    edemaMi: '',
    fc: '',
    nota: '',
  };
}

export function emptyConsultaEntry() {
  return {
    date: '',
    faseSeguimiento: '',
    contacto: '',
    comorbilidades: [],
    ultimoInternamientoFecha: '',
    ultimoInternamientoCausa: '',
    escaloDiureticos6m: null,
    escaloDiureticosVia: '',
    escaloDiureticosNota: '',
    subjetivo: emptySubjetivo(),
    objetivo: emptyObjetivo(),
    ekgDescripcion: '',
    ekgFecha: '',
    ekgEsPrevio: null,
    apreciativo: '',
    plan: '',
    gdmtMaxTolerada: {
      ieca_ara: null,
      arni: null,
      sglt2: null,
      arm: null,
      bb: null,
      asa: null,
    },
    fenotipo: '',
    etiologia: '',
    ritmo: '',
    ta: null,
    reingresoHospitalario: null,
    causaReingreso: '',
    muerte: null,
    causaMuerte: '',
    causaMuerteNota: '',
    malApego: null,
    tiempoImplementacionSemanas: null,
    implementacionCompleta: null,
    scoreTmo: null,
    dosisTitulada: {
      bb: '',
      iecaAraArni: '',
      arm: '',
      isglt2: '',
    },
    bbArniArmSglt2DosisMaxima: null,
    proximaConsultaFecha: '',
    cerrada: false,
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

/**
 * Merges a `subjetivo`/`objetivo` patch onto the previous value.
 * - Not present on `entry`: keep whatever `prevVal` already was (string or
 *   structured object) — no-op.
 * - Present and a plain string: stored verbatim, same as the old free-text
 *   behavior — this is the legacy write path and also how a pre-existing
 *   free-text entry stays a read-only string until a structured field is
 *   actually edited.
 * - Present and an object: shallow-merged onto the previous structured
 *   value, field by field (same coalesce-per-key shape as `gdmtMaxTolerada`).
 *   If `prevVal` was a legacy string, that string is not merged in — the
 *   structured object starts from defaults instead (per plan: "don't try to
 *   parse it into checkboxes").
 * @param {Record<string, unknown>} entry patch passed to `upsertConsultaEntry`
 * @param {string} key 'subjetivo' | 'objetivo'
 * @param {unknown} prevVal previous stored value (string, object, or undefined)
 * @param {() => Record<string, unknown>} emptyFn `emptySubjetivo` | `emptyObjetivo`
 */
function mergeNarrativeObject(entry, key, prevVal, emptyFn) {
  if (!Object.prototype.hasOwnProperty.call(entry, key)) {
    return prevVal !== undefined && prevVal !== null ? prevVal : emptyFn();
  }
  const next = entry[key];
  if (next == null) return emptyFn();
  if (typeof next === 'string') return next;
  const empty = emptyFn();
  const prevObj = prevVal && typeof prevVal === 'object' ? prevVal : null;
  const merged = {};
  for (const k of Object.keys(empty)) {
    merged[k] = coalesceField(next, k, prevObj ? prevObj[k] : undefined, empty[k]);
  }
  return merged;
}

export function upsertConsultaEntry(list, entry) {
  const date = String(entry.date || '').trim();
  const out = Array.isArray(list) ? list.slice() : [];
  const idx = out.findIndex((r) => r && r.date === date);
  const prev = idx >= 0 ? out[idx] : null;
  const defaults = emptyConsultaEntry();

  const row = { date };
  for (const key of Object.keys(defaults)) {
    if (key === 'date' || key === 'gdmtMaxTolerada' || key === 'dosisTitulada' || key === 'subjetivo' || key === 'objetivo')
      continue;
    row[key] = coalesceField(entry, key, prev && prev[key], defaults[key]);
  }
  row.subjetivo = mergeNarrativeObject(entry, 'subjetivo', prev && prev.subjetivo, emptySubjetivo);
  row.objetivo = mergeNarrativeObject(entry, 'objetivo', prev && prev.objetivo, emptyObjetivo);
  const nextGdmt = (entry && entry.gdmtMaxTolerada) || {};
  const prevGdmt = (prev && prev.gdmtMaxTolerada) || {};
  const gdmt = {};
  for (const key of Object.keys(defaults.gdmtMaxTolerada)) {
    gdmt[key] = coalesceField(nextGdmt, key, prevGdmt[key], defaults.gdmtMaxTolerada[key]);
  }
  row.gdmtMaxTolerada = gdmt;

  const nextDosisTitulada = (entry && entry.dosisTitulada) || {};
  const prevDosisTitulada = (prev && prev.dosisTitulada) || {};
  const dosisTitulada = {};
  for (const key of Object.keys(defaults.dosisTitulada)) {
    dosisTitulada[key] = coalesceField(nextDosisTitulada, key, prevDosisTitulada[key], defaults.dosisTitulada[key]);
  }
  row.dosisTitulada = dosisTitulada;

  if (idx >= 0) out[idx] = row;
  else out.push(row);
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

/**
 * Seed a new consulta entry from the last inpatient round (fenotipo/etiología/
 * ritmo snapshot comes from the patient's current top-level cardio state at
 * seed time, since `rondasByDay` doesn't carry those fields).
 * @param {any} cardio full patient.cardio object
 */
export function seedConsultaFromLastRonda(cardio) {
  const base = emptyConsultaEntry();
  const rondas = cardio && Array.isArray(cardio.rondasByDay) ? cardio.rondasByDay : [];
  if (!rondas.length) return base;

  const sorted = rondas.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const lastRonda = sorted[sorted.length - 1];

  return Object.assign({}, base, {
    fenotipo: String((cardio && cardio.fenotipo) || ''),
    etiologia: String((cardio && cardio.etiologia) || ''),
    ritmo: String((cardio && cardio.ritmo) || ''),
    ultimoInternamientoFecha: String((lastRonda && lastRonda.date) || ''),
  });
}
