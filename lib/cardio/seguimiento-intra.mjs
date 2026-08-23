/**
 * `cardio.rondasByDay` — daily inpatient round fields not already covered by
 * `pocusByDay` (congestion.mjs), `descongestion.mjs`, or `balance-historico.mjs`.
 */

export function emptyRondaEntry() {
  return {
    date: '',
    ta: '',
    fc: null,
    satO2: null,
    o2Sup: '',
    pesoActual: null,
    diuresis6h: null,
    diuresis24h: null,
    estertoresDerrame: '',
    plan: '',
    eventos: '',
    sixMwt: null,
    comorbilidadNota: '',
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

export function upsertRondaEntry(list, entry) {
  const date = String(entry.date || '').trim();
  const out = Array.isArray(list) ? list.slice() : [];
  const idx = out.findIndex((r) => r && r.date === date);
  const prev = idx >= 0 ? out[idx] : null;
  const defaults = emptyRondaEntry();

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
