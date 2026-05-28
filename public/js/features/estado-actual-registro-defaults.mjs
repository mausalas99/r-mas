/**
 * Defaults del modal «Registrar medición»: cierre de turno a las 00:00 de hoy,
 * glucometrías del turno previo (ayer 08:00 → hoy 00:00).
 */

/**
 * @param {Date} d
 * @returns {Date}
 */
export function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Última toma del turno: medianoche del día local actual.
 * @param {Date} [now]
 * @returns {Date}
 */
export function getDefaultRegistroRecordedAt(now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
  return startOfLocalDay(ref);
}

/**
 * Ventana de glucometrías: desde ayer 08:00 hasta la toma de cierre (hoy 00:00, inclusive).
 * @param {Date} [now]
 * @returns {{ start: Date, end: Date }}
 */
export function getGlucometriaRegistroWindow(now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
  var end = startOfLocalDay(ref);
  var start = new Date(end);
  start.setDate(start.getDate() - 1);
  start.setHours(8, 0, 0, 0);
  return { start: start, end: end };
}

/**
 * @param {string | undefined} iso
 * @returns {Date | null}
 */
function parseRecordedAt(iso) {
  if (!iso) return null;
  var d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * @param {Array<{ recordedAt?: string, glucometrias?: Array<{ value?: unknown, time?: string }> }>} historial
 * @param {Date} [now]
 * @returns {Array<{ value: unknown, time: string }>}
 */
export function collectGlucometriasForRegistroWindow(historial, now) {
  var hist = Array.isArray(historial) ? historial : [];
  var win = getGlucometriaRegistroWindow(now);
  /** @type {Array<{ value: unknown, time: string }>} */
  var out = [];
  /** @type {Set<string>} */
  var seen = new Set();

  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== 'object') continue;
    var at = parseRecordedAt(row.recordedAt);
    if (!at || at < win.start || at > win.end) continue;
    var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
    for (var j = 0; j < glus.length; j++) {
      var g = glus[j];
      if (!g || typeof g !== 'object') continue;
      var val = /** @type {any} */ (g).value;
      if (val == null || val === '') continue;
      var time = /** @type {any} */ (g).time != null ? String(/** @type {any} */ (g).time) : '';
      var key = String(val) + '@' + time;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: val, time: time });
    }
  }

  out.sort(function (a, b) {
    var ta = String(a.time || '');
    var tb = String(b.time || '');
    if (ta !== tb) return ta.localeCompare(tb);
    return String(a.value).localeCompare(String(b.value));
  });
  return out;
}
