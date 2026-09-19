/**
 * Long-format IC registry export: same data as `ic-registry-export.mjs`
 * (wide, one row per patient with 20 repeated visit blocks), reshaped into
 * two tables — one row per patient (Pacientes) and one row per patient per
 * visit (Visitas), linked by `Registro`. This is a pure reslicing of the
 * already-resolved wide row: it does not re-derive any clinical value, so
 * every value the wide export maps is mapped here too, with the same
 * deliberately-blank columns (bare "Dosis", "TAPSE/PSAP (0 = Normal, 1 =
 * Bajo)", etc.) preserved rather than silently dropped.
 */

import { IC_REGISTRY_HEADERS } from './ic-registry-headers.mjs';
import { tagColumnsByVisit, buildIcRegistryRow, PER_VISIT_RESOLVERS } from './ic-registry-export.mjs';

const ECO_MARKER_RE = /^ECO\s+\d+\s*cita/i;
const TMO_MARKER_RE = /^TMO\s+\d+\s*cita/i;

// Same drug list the wide export keys bare "Dosis" columns off of — a bare
// "Dosis" always follows one of these headers, never appears standalone.
const DRUG_PREFIXES = [
  'ARM (',
  'iSGLT2 (',
  'Vericiguat (',
  'Digoxina (',
  'Dinitrato (',
  'Hidralazina (',
  'Amiodarona (',
  'Ivabradina (',
  'ACO (',
  'Diurétcio VO al alta (',
  'Diurétcio VO (',
  'Tiazida al alta (',
  'Tiazida (',
];

/** @param {string} header */
function drugNameFromHeader(header) {
  const prefix = DRUG_PREFIXES.find((p) => header.startsWith(p));
  return prefix ? prefix.slice(0, -2).trim() : null;
}

/**
 * Rename every bare "Dosis" header to "Dosis <Drug>" using the drug header
 * immediately before it, so 10+ same-named "Dosis" columns per block don't
 * collapse into one ambiguous column. Non-bare headers pass through as-is.
 * @param {string[]} headers
 */
function nameBareDosisColumns(headers) {
  return headers.map((h, i) => {
    if (h.trim() !== 'Dosis' || i === 0) return h;
    const drug = drugNameFromHeader(headers[i - 1]);
    return drug ? `Dosis ${drug}` : h;
  });
}

const TAGS = tagColumnsByVisit(IC_REGISTRY_HEADERS);
const ECO_START = TAGS.findIndex((t) => t === 1);
const NUM_VISITS = Math.max(...TAGS);

// ---------------------------------------------------------------------------
// Pacientes headers: baseline slice, bare "Dosis" renamed. No dedup needed —
// the baseline block appears once.
// ---------------------------------------------------------------------------
// "Registro" (expediente) is user-entered and can be blank or duplicated, so
// it can't be trusted alone as the join key linking a Visitas row back to
// its patient. `ID` (the app's internal, always-unique patient id) is the
// real join key; `Registro` stays for the researcher to read.
export const ICR_PACIENTES_HEADERS = ['ID', ...nameBareDosisColumns(IC_REGISTRY_HEADERS.slice(0, ECO_START))];

// ---------------------------------------------------------------------------
// Visitas headers: one canonical column per distinct field, built by walking
// every visit block and grouping raw headers that are the *same field* by
// the exact criterion the wide export itself uses — same resolver function
// reference in PER_VISIT_RESOLVERS (that's how the wide export already
// treats "Congrestión" vs "Congestión" etc. as one field: same resolver, two
// keys). ECO/TMO date markers canonicalize to "Fecha ECO"/"Fecha TMO". A
// header with no resolver (deliberately blank, e.g. bare "Dosis" or
// unmapped diastolic-function fields) still gets its own column via its
// cleaned header text, so nothing the wide format carries is dropped here.
// ---------------------------------------------------------------------------
const visitBlockBounds = [];
{
  let start = ECO_START;
  for (let i = ECO_START + 1; i <= IC_REGISTRY_HEADERS.length; i += 1) {
    if (i === IC_REGISTRY_HEADERS.length || ECO_MARKER_RE.test(IC_REGISTRY_HEADERS[i])) {
      visitBlockBounds.push([start, i]);
      start = i;
    }
  }
}

const visitFieldLabels = []; // ordered canonical display names
const fnToLabel = new Map(); // resolver fn -> canonical label (fields keyed by resolver identity)
const textToLabel = new Map(); // cleaned header text -> canonical label (unmapped fields)
/** @type {{ blockStart: number, entries: [number, string][] }[]} */
const blockColumnMaps = [];

for (const [start, end] of visitBlockBounds) {
  const rawBlock = IC_REGISTRY_HEADERS.slice(start, end);
  const namedBlock = nameBareDosisColumns(rawBlock);
  /** @type {[number, string][]} */
  const entries = [];
  namedBlock.forEach((header, offset) => {
    let label;
    if (ECO_MARKER_RE.test(header)) {
      label = 'Fecha ECO';
    } else if (TMO_MARKER_RE.test(header)) {
      label = 'Fecha TMO';
    } else {
      const resolver = PER_VISIT_RESOLVERS[rawBlock[offset]];
      if (resolver) {
        if (!fnToLabel.has(resolver)) fnToLabel.set(resolver, header.trim());
        label = fnToLabel.get(resolver);
      } else {
        const key = header.trim();
        if (!textToLabel.has(key)) textToLabel.set(key, key);
        label = textToLabel.get(key);
      }
    }
    if (!visitFieldLabels.includes(label)) visitFieldLabels.push(label);
    entries.push([start + offset, label]);
  });
  blockColumnMaps.push({ blockStart: start, entries });
}

export const ICR_VISITAS_HEADERS = ['ID', 'Registro', 'Visita', ...visitFieldLabels];

const tmoMarkerOffsetByBlock = blockColumnMaps.map(({ entries }) => {
  const found = entries.find(([, label]) => label === 'Fecha TMO');
  return found ? found[0] : -1;
});

// ---------------------------------------------------------------------------
// Row assembly — reslices the wide row `buildIcRegistryRow` already computed.
// ---------------------------------------------------------------------------

const REGISTRO_IDX = ICR_PACIENTES_HEADERS.indexOf('Registro');
const LABEL_POS = new Map(visitFieldLabels.map((label, i) => [label, i]));

/**
 * @param {unknown} patient
 * @returns {{ pacienteRow: string[], visitRows: string[][] }}
 */
export function buildIcRegistryLongRowsForPatient(patient) {
  const { row } = buildIcRegistryRow(patient);
  const id = patient && typeof patient === 'object' ? String(patient.id ?? '') : '';
  const pacienteRow = [id, ...row.slice(0, ECO_START)];

  const visitRows = [];
  for (let v = 0; v < NUM_VISITS; v += 1) {
    const tmoIdx = tmoMarkerOffsetByBlock[v];
    if (tmoIdx < 0 || !row[tmoIdx]) continue; // no consulta for this visit — same test the wide export relies on
    const fieldValues = new Array(visitFieldLabels.length).fill('');
    for (const [colIdx, label] of blockColumnMaps[v].entries) {
      const pos = LABEL_POS.get(label);
      // First non-empty value wins per label (only relevant for the very
      // rare case of two distinct raw columns collapsing onto one label
      // with different values — doesn't happen for the current headers,
      // but keeps this safe if the source template drifts further).
      if (fieldValues[pos] === '' && row[colIdx] !== '') fieldValues[pos] = row[colIdx];
    }
    visitRows.push([id, pacienteRow[REGISTRO_IDX], String(v + 1), ...fieldValues]);
  }

  return { pacienteRow, visitRows };
}

/**
 * @param {unknown[]} patients
 * @returns {{ pacientesHeaders: string[], pacientesRows: string[][], visitasHeaders: string[], visitasRows: string[][] }}
 */
export function buildIcRegistryLongRows(patients) {
  const list = Array.isArray(patients) ? patients : [];
  /** @type {string[][]} */
  const pacientesRows = [];
  /** @type {string[][]} */
  const visitasRows = [];
  for (const patient of list) {
    if (!patient || typeof patient !== 'object') continue;
    const { pacienteRow, visitRows } = buildIcRegistryLongRowsForPatient(patient);
    pacientesRows.push(pacienteRow);
    visitasRows.push(...visitRows);
  }
  return {
    pacientesHeaders: ICR_PACIENTES_HEADERS.slice(),
    pacientesRows,
    visitasHeaders: ICR_VISITAS_HEADERS.slice(),
    visitasRows,
  };
}
