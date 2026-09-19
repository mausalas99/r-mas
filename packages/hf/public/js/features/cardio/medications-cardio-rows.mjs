/**
 * Pure row/state helpers for the Manejo actual cardio cards
 * (4 Fantásticos GDMT, Otros medicamentos, Diuréticos).
 * No DOM here — see medications-cardio-html.mjs (markup) and
 * medications-cardio-mount.mjs (DOM wiring + persistence).
 */
import {
  FANTASTICO_CLASSES,
  isMisplacedFantasticoDrug,
  sumFurosemidaMg,
} from "../../../../lib/cardio/med-segments.mjs";

/**
 * GDMT titration-state vocabulary for the pillar status pill.
 * ASSUMPTION: lib/cardio/med-segments.mjs's `emptyFantasticos()` row shape
 * (className/drug/inicio/dosis/tolerancia) has no fixed titration-state
 * field — Cardionotas's own manejo panel never modeled one either, `tolerancia`
 * there is free text. This adds a new `estado` key to each fantástico row
 * (stored on patient.cardio.fantasticos[i].estado) with the 5-state
 * vocabulary named in the plan. Existing/backfilled rows without the key
 * read as '' → "No indicado".
 * @type {Array<{ value: string, label: string, tone: 'neutral'|'info'|'warn'|'success'|'danger' }>}
 */
export var FANTASTICO_ESTADOS = [
  { value: "", label: "No indicado", tone: "neutral" },
  { value: "iniciado", label: "Iniciado", tone: "info" },
  { value: "titulando", label: "Titulando", tone: "warn" },
  { value: "objetivo", label: "Dosis objetivo", tone: "success" },
  { value: "contraindicado", label: "Contraindicado", tone: "danger" },
];

/**
 * @param {unknown} estado
 * @returns {{ value: string, label: string, tone: string }}
 */
export function fantasticoEstadoMeta(estado) {
  var key = String(estado || "").trim();
  for (var i = 0; i < FANTASTICO_ESTADOS.length; i++) {
    if (FANTASTICO_ESTADOS[i].value === key) return FANTASTICO_ESTADOS[i];
  }
  return FANTASTICO_ESTADOS[0];
}

/**
 * Ensure exactly one row per FANTASTICO_CLASSES pillar, in fixed order.
 * @param {unknown} fantasticos
 * @returns {Array<{ className: string, drug: string, inicio: string, dosis: string, tolerancia: string, estado: string }>}
 */
export function normalizeFantasticosRows(fantasticos) {
  var byClass = new Map();
  if (Array.isArray(fantasticos)) {
    for (var i = 0; i < fantasticos.length; i++) {
      var row = fantasticos[i];
      if (!row || typeof row !== "object") continue;
      var key = String(row.className || "").trim();
      if (!key) continue;
      byClass.set(key, {
        className: key,
        drug: String(row.drug || ""),
        inicio: String(row.inicio || ""),
        dosis: String(row.dosis || ""),
        tolerancia: String(row.tolerancia || ""),
        estado: String(row.estado || ""),
      });
    }
  }
  return FANTASTICO_CLASSES.map(function (className) {
    var row =
      byClass.get(className) ||
      {
        className: className,
        drug: "",
        inicio: "",
        dosis: "",
        tolerancia: "",
        estado: "",
      };
    var drug = row.drug;
    // Drop values clearly belonging to another pillar / diuretics (e.g. Furosemida in SGLT2i).
    if (isMisplacedFantasticoDrug(className, drug)) drug = "";
    return {
      className: className,
      drug: drug,
      inicio: row.inicio,
      dosis: row.dosis,
      tolerancia: row.tolerancia,
      estado: row.estado,
    };
  });
}

/**
 * @param {unknown} fantasticos
 * @param {string} className
 * @param {'drug' | 'inicio' | 'dosis' | 'tolerancia' | 'estado'} field
 * @param {unknown} value
 * @returns {Array<{ className: string, drug: string, inicio: string, dosis: string, tolerancia: string, estado: string }>}
 */
export function updateFantasticoField(fantasticos, className, field, value) {
  var rows = normalizeFantasticosRows(fantasticos);
  return rows.map(function (row) {
    if (row.className !== className) return Object.assign({}, row);
    var next = Object.assign({}, row);
    next[field] = String(value == null ? "" : value);
    return next;
  });
}

/**
 * @param {unknown} segments
 * @returns {Array<{
 *   id: string, tipo: string, inicio: string, dosis: string,
 *   indicacion: string, endedAt: string | null, mgTotal: number | null, active: boolean,
 * }>}
 */
export function buildSegmentRows(segments) {
  if (!Array.isArray(segments)) return [];
  return segments
    .filter(function (s) {
      return s && typeof s === "object";
    })
    .map(function (s) {
      var endedAt = s.endedAt == null || s.endedAt === "" ? null : String(s.endedAt);
      var mgRaw = s.mgTotal;
      var mgTotal =
        mgRaw == null || mgRaw === ""
          ? null
          : Number.isFinite(Number(mgRaw))
            ? Number(mgRaw)
            : null;
      return {
        id: String(s.id || ""),
        tipo: String(s.tipo || ""),
        inicio: String(s.inicio || ""),
        dosis: String(s.dosis || ""),
        indicacion: String(s.indicacion || ""),
        endedAt: endedAt,
        mgTotal: mgTotal,
        active: !endedAt,
      };
    });
}

/**
 * Diuretic card totals: sum of every segment's explicit mgTotal (any diuretic,
 * whatever is entered) plus the accumulated-furosemide figure from
 * med-segments.mjs's own `sumFurosemidaMg` (dosis × days when mgTotal is absent).
 * @param {unknown} segments
 * @param {string} [asOfDate] YYYY-MM-DD, defaults to today (see sumFurosemidaMg)
 * @returns {{ explicitMgTotal: number, furosemidaMg: number }}
 */
export function diureticTotals(segments, asOfDate) {
  var list = Array.isArray(segments) ? segments : [];
  var explicitMgTotal = list.reduce(function (sum, s) {
    if (s && s.mgTotal != null && s.mgTotal !== "" && Number.isFinite(Number(s.mgTotal))) {
      return sum + Number(s.mgTotal);
    }
    return sum;
  }, 0);
  return {
    explicitMgTotal: explicitMgTotal,
    furosemidaMg: sumFurosemidaMg(list, asOfDate),
  };
}
