/**
 * `cardio.echoStudies` — dated formal echocardiogram studies (FEVI, cavity
 * dimensions, valve grades, VExUS components, TAPSE/PSAP, etc.).
 *
 * NOT the same store as `pocusByDay` (congestion.mjs): `pocusByDay` is the
 * daily/per-encounter POCUS congestion check, canonical for day-to-day VExUS
 * tracking. `echoStudies` captures a formal, less-frequent echo study whose
 * paper-form table needs VExUS alongside FEVI/valve grades in one row. This
 * module must not read from or write to `pocusByDay`.
 */

export function emptyEchoStudy() {
  return {
    date: '',
    fevi: null,
    vfdvi: null,
    vfsvi: null,
    septumIvd: null,
    dvid: null,
    ppvid: null,
    gpr: null,
    volAiIndex: null,
    areaAd: null,
    diametroVd: null,
    it: '',
    im: '',
    iao: '',
    ip: '',
    estenosis: '',
    estenosisSeveridad: '',
    itVmax: null,
    pad: null,
    tapse: null,
    psap: null,
    tapsePsap: null,
    vciMm: null,
    vciColapso: '',
    dopplerHepaticas: '',
    pulsatilidadPorta: '',
    dopplerRenal: '',
    vexus: '',
    patronPulmonar: '',
    lineasBPorCampo: '',
    jvdRatio: null,
    nota: '',
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

export function upsertEchoStudy(list, entry) {
  const date = String(entry.date || '').trim();
  const out = Array.isArray(list) ? list.slice() : [];
  const idx = out.findIndex((r) => r && r.date === date);
  const prev = idx >= 0 ? out[idx] : null;
  const defaults = emptyEchoStudy();

  const row = { date };
  for (const key of Object.keys(defaults)) {
    if (key === 'date') continue;
    row[key] = coalesceField(entry, key, prev && prev[key], defaults[key]);
  }

  if (idx >= 0) out[idx] = row;
  else out.push(row);
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

/**
 * Most recent two echo studies by date, for Previo/Actual rendering.
 * @param {any[]} list
 * @returns {{ previo: any|null, actual: any|null }}
 */
export function latestTwoEchoStudies(list) {
  const sorted = (Array.isArray(list) ? list.slice() : []).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const n = sorted.length;
  return {
    actual: n >= 1 ? sorted[n - 1] : null,
    previo: n >= 2 ? sorted[n - 2] : null,
  };
}
