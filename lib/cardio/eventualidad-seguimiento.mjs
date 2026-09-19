/**
 * `cardio.eventualidadesSeguimiento` — one record per follow-up day during a
 * hospitalization (repeatable version of `cardio.evaluacionInicial`'s
 * clinical sections; the intake-only fields — motivo de consulta,
 * antecedentes, medicamentos previos, historia de IC previa, tratamiento
 * previo, FA/dispositivo — are NOT part of this shape, see
 * `evaluacion-inicial.mjs`). Sub-object key names intentionally match
 * `evaluacionInicial`'s (`exploracion`, `vexusInicial`, `usPulmonar`,
 * `rxTorax`, `labsIngreso`) so the wizard can reuse its section HTML
 * builders and field-change reducers unmodified.
 */

export function emptyEventualidadSeguimientoEntry() {
  return {
    date: '',
    exploracion: {
      ta: '',
      fc: null,
      satO2: null,
      pvy: null,
      soplo: null,
      soploNota: '',
      estertores: null,
      estertoresNota: '',
      ascitisHepatomegalia: null,
      edemaMi: '',
      llenadoCapilar: '',
      temperaturaExtremidades: '',
    },
    vexusInicial: {
      grado: '',
      vciMm: null,
      vciColapso: '',
      dopplerHepaticas: '',
      pulsatilidadPorta: '',
      dopplerRenal: '',
    },
    usPulmonar: {
      campos: [
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
      ],
      nota: '',
    },
    rxTorax: {
      hallazgos: [],
      nota: '',
    },
    ecgIngreso: '',
    feviEstimadaInicial: null,
    labsIngreso: {
      fecha: '',
      na: null,
      k: null,
      mg: null,
      creat: null,
      bun: null,
      fa: null,
      hb: null,
      ntProBnp: null,
      lactato: null,
      bilTotal: null,
      bilDirecta: null,
      bicarbonato: null,
      ph: null,
      troponina: null,
    },
    impresionDiagnostica: '',
    planTerapeutico: '',
    nau2hPostBolo: null,
    gastoUrinario6h: null,
  };
}

/**
 * Prefer explicit `next` when the key is present on `record`; otherwise keep `prev`.
 */
function coalesceField(record, key, prevVal, emptyVal) {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    const v = record[key];
    return v === undefined || v === null ? emptyVal : v;
  }
  return prevVal !== undefined && prevVal !== null ? prevVal : emptyVal;
}

function mergeSubObject(entry, key, prev, emptyFn) {
  const empty = emptyFn();
  const next = (entry && entry[key]) || {};
  const prevObj = (prev && prev[key]) || {};
  const merged = {};
  for (const k of Object.keys(empty)) {
    merged[k] = coalesceField(next, k, prevObj[k], empty[k]);
  }
  return merged;
}

function emptyExploracion() {
  return emptyEventualidadSeguimientoEntry().exploracion;
}
function emptyVexusInicial() {
  return emptyEventualidadSeguimientoEntry().vexusInicial;
}
function emptyLabsIngreso() {
  return emptyEventualidadSeguimientoEntry().labsIngreso;
}

/**
 * @param {any[]} list current `cardio.eventualidadesSeguimiento`
 * @param {any} entry patch — must include `date`
 * @returns {any[]} next list, sorted by date ascending
 */
export function upsertEventualidadEntry(list, entry) {
  const date = String((entry && entry.date) || '').trim();
  const out = Array.isArray(list) ? list.slice() : [];
  const idx = out.findIndex((r) => r && r.date === date);
  const prev = idx >= 0 ? out[idx] : null;
  const defaults = emptyEventualidadSeguimientoEntry();

  const row = { date };
  for (const key of Object.keys(defaults)) {
    if (key === 'date' || key === 'exploracion' || key === 'vexusInicial' || key === 'usPulmonar' || key === 'rxTorax' || key === 'labsIngreso')
      continue;
    row[key] = coalesceField(entry, key, prev && prev[key], defaults[key]);
  }
  row.exploracion = mergeSubObject(entry, 'exploracion', prev, emptyExploracion);
  row.vexusInicial = mergeSubObject(entry, 'vexusInicial', prev, emptyVexusInicial);
  row.labsIngreso = mergeSubObject(entry, 'labsIngreso', prev, emptyLabsIngreso);

  const nextUs = (entry && entry.usPulmonar) || {};
  const prevUs = (prev && prev.usPulmonar) || {};
  const camposIn = Array.isArray(nextUs.campos) ? nextUs.campos : Array.isArray(prevUs.campos) ? prevUs.campos : defaults.usPulmonar.campos;
  row.usPulmonar = {
    campos: defaults.usPulmonar.campos.map((defaultCampo, i) => Object.assign({}, defaultCampo, camposIn[i] || {})),
    nota: coalesceField(nextUs, 'nota', prevUs.nota, ''),
  };

  const nextRx = (entry && entry.rxTorax) || {};
  const prevRx = (prev && prev.rxTorax) || {};
  row.rxTorax = {
    hallazgos: Array.isArray(nextRx.hallazgos) ? nextRx.hallazgos : Array.isArray(prevRx.hallazgos) ? prevRx.hallazgos : [],
    nota: coalesceField(nextRx, 'nota', prevRx.nota, ''),
  };

  if (idx >= 0) out[idx] = row;
  else out.push(row);
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

/**
 * @param {any} cardio
 * @param {string} date
 */
export function findEventualidadEntry(cardio, date) {
  const list = cardio && Array.isArray(cardio.eventualidadesSeguimiento) ? cardio.eventualidadesSeguimiento : [];
  return list.find((e) => e && e.date === date) || null;
}

/**
 * Ensures a `cardio.eventualidadesSeguimiento[]` entry exists for `date`,
 * mutating `patient.cardio.eventualidadesSeguimiento` in place (caller
 * persists). No seeding from prior data — every new date starts blank.
 * @param {{ cardio?: any }} patient
 * @param {string} date
 * @returns {any} the entry now present at `date`
 */
export function ensureEventualidadEntryForDate(patient, date) {
  const cardio = patient.cardio;
  const list = Array.isArray(cardio.eventualidadesSeguimiento) ? cardio.eventualidadesSeguimiento : [];
  const existing = findEventualidadEntry(cardio, date);
  if (existing) return existing;
  const seeded = Object.assign({}, emptyEventualidadSeguimientoEntry(), { date });
  cardio.eventualidadesSeguimiento = upsertEventualidadEntry(list, seeded);
  return findEventualidadEntry(cardio, date);
}

/** @param {any} cardio */
export function listEventualidadDatesDesc(cardio) {
  const list = cardio && Array.isArray(cardio.eventualidadesSeguimiento) ? cardio.eventualidadesSeguimiento : [];
  return list
    .map((e) => e && e.date)
    .filter(Boolean)
    .slice()
    .sort()
    .reverse();
}
