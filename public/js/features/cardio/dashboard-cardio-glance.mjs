/**
 * Pure model: HF-specific glance data for the Resumen dashboard —
 * fenotipo/etiología, congestion state (score/VExUS/Stevenson), diuresis
 * 24h/acumulada + furosemida acumulada, and GDMT ("4 Fantásticos") pillar
 * status. Kept separate from dashboard-model.mjs so it can be unit-tested
 * without pulling in labs/EA glance concerns, and reused by both the
 * Resumen dashboard and (later) other cardio surfaces.
 */
import { emptyCardio } from '../../../../lib/cardio/patient-cardio.mjs';
import { sumFurosemidaMg, listActiveMeds } from '../../../../lib/cardio/med-segments.mjs';
import { normalizeDevice } from '../../../../lib/cardio/hf-device.mjs';
import { latestTwoScores } from '../../../../lib/cardio/hf-scores.mjs';

/** @param {unknown} patient */
function resolveCardio(patient) {
  var c = patient && typeof patient === 'object' ? /** @type {any} */ (patient).cardio : null;
  return c && typeof c === 'object' ? c : emptyCardio();
}

/** @param {unknown} iso */
function localYmd(iso) {
  if (!iso) return '';
  var d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function todayYmdLocal() {
  return localYmd(new Date().toISOString());
}

/**
 * Numeric diuresis entries from `monitoreo.historial[].io.egrParts` where
 * `kind === 'diuresis'` (non-quantified/"NC" entries are skipped — they
 * cannot be summed).
 * @param {unknown} monitoreo
 * @returns {Array<{ ymd: string, value: number }>}
 */
function extractDiuresisEntries(monitoreo) {
  var hist =
    monitoreo && typeof monitoreo === 'object' && Array.isArray(/** @type {any} */ (monitoreo).historial)
      ? /** @type {any} */ (monitoreo).historial
      : [];
  /** @type {Array<{ ymd: string, value: number }>} */
  var out = [];
  hist.forEach(function (row) {
    if (!row || typeof row !== 'object') return;
    var io = row.io && typeof row.io === 'object' ? row.io : null;
    if (!io || !Array.isArray(io.egrParts)) return;
    var ymd = localYmd(row.recordedAt);
    io.egrParts.forEach(function (part) {
      if (!part || typeof part !== 'object' || part.kind !== 'diuresis') return;
      var v = Number(part.value);
      if (!Number.isFinite(v)) return;
      out.push({ ymd: ymd, value: v });
    });
  });
  return out;
}

/**
 * @param {Array<{ ymd: string, value: number }>} entries
 * @param {string} [ymdFilter]
 */
function sumDiuresis(entries, ymdFilter) {
  return entries.reduce(function (sum, e) {
    if (ymdFilter && e.ymd !== ymdFilter) return sum;
    return sum + e.value;
  }, 0);
}

/**
 * Latest POCUS/exam day — `pocusByDay` is kept sorted ascending by date
 * (see lib/cardio/congestion.mjs upsertPocusDay), so the last entry is
 * the most recent.
 * @param {unknown} pocusByDay
 */
function resolveLatestPocus(pocusByDay) {
  var list = Array.isArray(pocusByDay) ? pocusByDay : [];
  return list.length ? list[list.length - 1] : null;
}

/**
 * Same narrow NT-proBNP regex used by `consulta-ic-data.mjs`'s
 * `buildLabHistoryForPrefill()` — kept as its own copy here (rather than
 * importing that module, which pulls in `app-state.mjs`/`getLabHistory`)
 * so this stays a pure function over the `labSets` array the caller already
 * has (see `dashboard-mount.mjs`: `getLabHistory()[pid] || []`).
 * @param {string} row
 * @returns {string|null}
 */
function extractNtProBnpFromRow(row) {
  var s = String(row || '');
  var m = /NT[\s-]?PRO\s*BNP\D{0,12}([\d.,]+)/i.exec(s);
  return m ? m[1] : null;
}

/**
 * Most recent NT-proBNP value found across the patient's imported lab sets
 * (`labSets` is kept in chronological order, oldest first — same assumption
 * `buildLabHistoryForPrefill` makes: the last match found wins).
 * @param {unknown} labSets
 * @returns {string}
 */
function latestNtProBnp(labSets) {
  var sets = Array.isArray(labSets) ? labSets : [];
  var found = '';
  sets.forEach(function (set) {
    var rows = (set && typeof set === 'object' && Array.isArray(set.resLabs)) ? set.resLabs : [];
    rows.forEach(function (row) {
      var val = extractNtProBnpFromRow(row);
      if (val != null) found = val;
    });
  });
  return found;
}

/**
 * Compact dispositivo label for the Resumen chip — `''` when there's
 * nothing worth surfacing (no indication and nothing implanted).
 * @param {unknown} deviceLike
 */
function deviceChipLabel(deviceLike) {
  var d = normalizeDevice(deviceLike);
  if (d.colocado) return String(d.tipo || 'Dispositivo').trim();
  if (d.tieneIndicacion) return 'Indicado, no colocado';
  return '';
}

/**
 * @param {unknown} patient
 * @param {{ todayYmd?: string, asOfDate?: string, labSets?: unknown[] }} [opts]
 */
export function buildCardioGlanceModel(patient, opts) {
  var o = opts && typeof opts === 'object' ? opts : {};
  var cardio = resolveCardio(patient);
  var monitoreo = patient && typeof patient === 'object' ? /** @type {any} */ (patient).monitoreo : null;
  var todayYmd = o.todayYmd || todayYmdLocal();
  var asOfDate = o.asOfDate || todayYmd;

  var latestPocus = resolveLatestPocus(cardio.pocusByDay);
  var vexusIngreso =
    cardio.vexusIngreso != null && Number.isFinite(Number(cardio.vexusIngreso))
      ? Number(cardio.vexusIngreso)
      : null;
  var pocusVexus = latestPocus && latestPocus.vexus != null ? Number(latestPocus.vexus) : null;
  var congestion = {
    score: latestPocus && latestPocus.congestionScore != null ? Number(latestPocus.congestionScore) : null,
    vexus: pocusVexus != null ? pocusVexus : vexusIngreso,
    stevenson: latestPocus && latestPocus.stevenson ? String(latestPocus.stevenson) : '',
    date: latestPocus ? String(latestPocus.date || '') : '',
    hasData: !!(latestPocus || vexusIngreso != null),
  };

  var diuresisEntries = extractDiuresisEntries(monitoreo);
  var hasToday = diuresisEntries.some(function (e) {
    return e.ymd === todayYmd;
  });
  var furosemidaAcumuladaMg = sumFurosemidaMg(cardio.diureticSegments, asOfDate);

  var gdmt = (Array.isArray(cardio.fantasticos) ? cardio.fantasticos : []).map(function (f) {
    var drug = String((f && f.drug) || '').trim();
    return {
      className: String((f && f.className) || ''),
      active: !!drug,
      drug: drug,
      dosis: String((f && f.dosis) || '').trim(),
    };
  });

  var scoreActual = latestTwoScores(cardio.scores).actual;

  return {
    fenotipo: String(cardio.fenotipo || '').trim(),
    etiologia: String(cardio.etiologia || '').trim(),
    congestion: congestion,
    diuresis: {
      hoyMl: hasToday ? sumDiuresis(diuresisEntries, todayYmd) : null,
      acumuladaMl: diuresisEntries.length ? sumDiuresis(diuresisEntries) : null,
      furosemidaAcumuladaMg: furosemidaAcumuladaMg,
      activeDiureticCount: listActiveMeds(cardio.diureticSegments || []).length,
    },
    gdmt: gdmt,
    // Resumen chips (Part C, Phase 7) — additive summary of dispositivo,
    // NYHA actual, and último NT-proBNP importado.
    chips: {
      dispositivo: deviceChipLabel(cardio.device),
      nyha: scoreActual && scoreActual.nyha ? String(scoreActual.nyha) : '',
      ntProBnp: latestNtProBnp(o.labSets),
    },
  };
}
