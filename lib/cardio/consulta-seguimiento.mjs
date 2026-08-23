/**
 * `cardio.consultas` — one record per outpatient HF follow-up visit
 * (Consulta Externa). `fenotipo`/`etiologia`/`ritmo` here are per-visit
 * SNAPSHOTS, not live references to the top-level `cardio` fields — a
 * patient's fenotipo can change over time (e.g. HFimpEF after recovery) and
 * each visit should preserve what was true at that visit.
 */

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
    subjetivo: '',
    objetivo: '',
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

export function upsertConsultaEntry(list, entry) {
  const date = String(entry.date || '').trim();
  const out = Array.isArray(list) ? list.slice() : [];
  const idx = out.findIndex((r) => r && r.date === date);
  const prev = idx >= 0 ? out[idx] : null;
  const defaults = emptyConsultaEntry();

  const row = { date };
  for (const key of Object.keys(defaults)) {
    if (key === 'date' || key === 'gdmtMaxTolerada') continue;
    row[key] = coalesceField(entry, key, prev && prev[key], defaults[key]);
  }
  const nextGdmt = (entry && entry.gdmtMaxTolerada) || {};
  const prevGdmt = (prev && prev.gdmtMaxTolerada) || {};
  const gdmt = {};
  for (const key of Object.keys(defaults.gdmtMaxTolerada)) {
    gdmt[key] = coalesceField(nextGdmt, key, prevGdmt[key], defaults.gdmtMaxTolerada[key]);
  }
  row.gdmtMaxTolerada = gdmt;

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
