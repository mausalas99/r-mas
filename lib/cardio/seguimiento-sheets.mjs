/**
 * Seguimiento IC → Google Sheets / Excel (TSV) export rows.
 */

import { computeDescongestion } from './descongestion.mjs';
import { getPocusDay } from './congestion.mjs';
import { listActiveMeds, parseDosisDailyMg, sumFurosemidaMg } from './med-segments.mjs';
import { ensureCardio } from './patient-cardio.mjs';
import { sumBalanceAcumuladoMl, balanceAcumuladoByDay } from './balance-historico.mjs';
import { normalizeDevice } from './hf-device.mjs';
import { latestTwoScores } from './hf-scores.mjs';
import {
  localYmd,
  recordedAtToLocalYmd,
  resolveIoDiuresisMl,
} from './ic-export-payload-map.mjs';
import { resolveIngresoYmd, toYmd } from './ic-export-payload-dates.mjs';

/** Cohort row columns (paste into Google Sheets header row). */
export const SEGUIMIENTO_COHORT_HEADERS = [
  'Seguimiento hospitalización',
  'Seguimiento consulta',
  'VEXUS INGRESO',
  'DOSIS INICIAL DIURETICO',
  'BALANCE ACUMULADO',
  'TENDENCIAS',
  'FASES DOSIS MAXIMO',
  'Nombre',
  'Registro',
  'Fecha ingreso',
  'Días internamiento',
  'Diuresis acumulada (ml)',
  'Furosemida acumulada (mg)',
  'Fecha corte',
  // Part C, Phase 7 — kept in sync with the Resumen dashboard chips
  // (dashboard-cardio-glance.mjs's model.cardio.chips) and ic-export-payload.mjs.
  'Dispositivo',
  'NYHA actual',
  'NT-proBNP último',
];

/** Daily hospitalization tracking columns. */
export const SEGUIMIENTO_DIARIO_HEADERS = [
  'Fecha',
  'VExUS',
  'Congestion score',
  'Balance acumulado',
  'Diuresis (ml)',
  'Dosis diurético activa',
  'Nota POCUS',
];

/**
 * @param {unknown} cell
 */
function escTsvCell(cell) {
  const s = cell == null ? '' : String(cell);
  if (/[\t\n\r"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {string[]} headers
 * @param {string[][]} rows
 */
export function rowsToTsv(headers, rows) {
  const lines = [headers.map(escTsvCell).join('\t')];
  for (const row of rows) {
    lines.push(row.map(escTsvCell).join('\t'));
  }
  return lines.join('\n');
}

/**
 * @param {unknown} segments
 * @returns {string}
 */
export function formatFasesDosisMaximo(segments) {
  const list = Array.isArray(segments) ? segments : [];
  if (!list.length) return '';
  const parts = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (!s) continue;
    const tipo = String(s.tipo || '').trim() || 'Diurético';
    const dosis = String(s.dosis || '').trim();
    const daily = parseDosisDailyMg(dosis);
    const maxLabel = daily ? `${daily} mg/d` : dosis;
    const inicio = String(s.inicio || '').trim();
    const ended = s.endedAt ? String(s.endedAt).trim() : 'activo';
    parts.push(`Fase ${i + 1}: ${tipo} ${maxLabel} (${inicio}→${ended})`);
  }
  return parts.join('; ');
}

/**
 * @param {unknown} segments
 * @returns {string}
 */
export function resolveDosisInicialDiuretico(cardio) {
  /** @type {any} */
  const c = cardio || {};
  const explicit = String(c.dosisInicialDiuretico || '').trim();
  if (explicit) return explicit;
  const segs = Array.isArray(c.diureticSegments) ? c.diureticSegments : [];
  if (!segs.length) return '';
  const sorted = segs
    .filter((s) => s && String(s.inicio || '').trim())
    .slice()
    .sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  const first = sorted[0];
  if (!first) return '';
  const tipo = String(first.tipo || '').trim();
  const dosis = String(first.dosis || '').trim();
  return [tipo, dosis].filter(Boolean).join(' ');
}

/**
 * @param {unknown} cardio
 * @param {string} ingresoDate
 * @returns {number | null}
 */
export function resolveVexusIngreso(cardio, ingresoDate) {
  /** @type {any} */
  const c = cardio || {};
  if (c.vexusIngreso != null && Number.isFinite(Number(c.vexusIngreso))) {
    return Number(c.vexusIngreso);
  }
  const ingreso = toYmd(ingresoDate);
  const pocus = Array.isArray(c.pocusByDay) ? c.pocusByDay : [];
  if (ingreso) {
    const day = getPocusDay(pocus, ingreso);
    if (day && day.vexus != null && Number.isFinite(Number(day.vexus))) {
      return Number(day.vexus);
    }
  }
  const sorted = pocus
    .filter((p) => p && String(p.date || '').trim())
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const first = sorted[0];
  if (first && first.vexus != null && Number.isFinite(Number(first.vexus))) {
    return Number(first.vexus);
  }
  return null;
}

const TENDENCIA_KEYS = [
  ['creat', 'Creat'],
  ['sodio', 'Na'],
  ['potasio', 'K'],
  ['bun', 'BUN'],
  ['ntprobnp', 'NT-proBNP'],
];

/**
 * @param {unknown} vals
 * @param {Map<string, { at: string, value: number }>} latest
 * @param {string} at
 */
function mergeTendenciasVals(vals, latest, at) {
  if (!vals || typeof vals !== 'object') return;
  for (const [field, label] of TENDENCIA_KEYS) {
    const raw = vals[field] ?? vals[label] ?? vals[label.toLowerCase()];
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const prev = latest.get(label);
    if (!prev || at >= prev.at) latest.set(label, { at, value: n });
  }
}

/**
 * @param {unknown} labHistory
 * @returns {Map<string, { at: string, value: number }>}
 */
function buildTendenciasLatestMap(labHistory) {
  const hist = Array.isArray(labHistory) ? labHistory : [];
  /** @type {Map<string, { at: string, value: number }>} */
  const latest = new Map();
  for (const entry of hist) {
    if (!entry || typeof entry !== 'object') continue;
    /** @type {any} */
    const e = entry;
    const at = String(e.at || e.date || e.recordedAt || '');
    const vals = e.valores || e.values || e.parsed || e;
    mergeTendenciasVals(vals, latest, at);
  }
  return latest;
}

/**
 * Key lab values for TENDENCIAS column (latest numeric per analyte).
 * @param {unknown} labHistory
 * @returns {string}
 */
export function formatTendenciasResumen(labHistory) {
  const latest = buildTendenciasLatestMap(labHistory);
  if (!latest.size) return '';
  return Array.from(latest.entries())
    .map(([label, v]) => `${label} ${v.value}`)
    .join('; ');
}

/**
 * Último NT-proBNP numérico (Part C, Phase 7 — same "último valor" the
 * Resumen dashboard chip shows), pulled from the same TENDENCIAS lab-history
 * parsing this file already does — not a second parsing pipeline.
 * @param {unknown} labHistory
 * @returns {number | ''}
 */
export function resolveNtProBnpUltimo(labHistory) {
  const entry = buildTendenciasLatestMap(labHistory).get('NT-proBNP');
  return entry ? entry.value : '';
}

/**
 * Compact dispositivo label — mirrors `dashboard-cardio-glance.mjs`'s
 * `deviceChipLabel()` so the export and the Resumen chip never diverge.
 * @param {unknown} cardio
 * @returns {string}
 */
export function resolveDispositivoLabel(cardio) {
  /** @type {any} */
  const c = cardio || {};
  const d = normalizeDevice(c.device);
  if (d.colocado) return String(d.tipo || 'Dispositivo').trim();
  if (d.tieneIndicacion) return 'Indicado, no colocado';
  return '';
}

/**
 * NYHA from the most recent `cardio.scores` entry.
 * @param {unknown} cardio
 * @returns {string}
 */
export function resolveNyhaActual(cardio) {
  /** @type {any} */
  const c = cardio || {};
  const actual = latestTwoScores(c.scores).actual;
  return actual && actual.nyha ? String(actual.nyha) : '';
}

/**
 * @param {unknown} monitoreo
 * @param {string} asOfDate
 * @returns {number[]}
 */
function extractDailyDiuresisMl(monitoreo) {
  const hist = monitoreo && Array.isArray(monitoreo.historial) ? monitoreo.historial : [];
  /** @type {Map<string, number>} */
  const byDay = new Map();
  for (const row of hist) {
    if (!row || typeof row !== 'object') continue;
    /** @type {any} */
    const r = row;
    const ymd = recordedAtToLocalYmd(r.recordedAt);
    if (!ymd) continue;
    const n = resolveIoDiuresisMl(r.io || {});
    if (n == null) continue;
    byDay.set(ymd, (byDay.get(ymd) || 0) + n);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((e) => e[1]);
}

/**
 * @param {unknown} patient
 * @param {{ asOfDate?: string, labHistory?: unknown[] }} [opts]
 */
export function buildSeguimientoCohortRow(patient, opts = {}) {
  /** @type {any} */
  const p = patient && typeof patient === 'object' ? patient : {};
  ensureCardio(p);
  /** @type {any} */
  const cardio = p.cardio || {};
  const asOfDate = toYmd(opts.asOfDate) || localYmd();
  const ingresoDate = resolveIngresoYmd(p);
  const dailyDiuresis = extractDailyDiuresisMl(p.monitoreo);
  const balanceSum = sumBalanceAcumuladoMl(p.monitoreo);
  const furoMg = sumFurosemidaMg(cardio.diureticSegments, asOfDate);
  const computed = computeDescongestion({
    ingresoDate,
    asOfDate,
    inicioDescongestion: cardio.inicioDescongestion || '',
    dailyDiuresisMl: dailyDiuresis,
    furosemidaAcumuladaMg: furoMg,
    balanceAcumuladoMl: balanceSum,
    overrides: cardio.overrides || {},
  });
  const labs = Array.isArray(opts.labHistory)
    ? opts.labHistory
    : Array.isArray(p.labHistory)
      ? p.labHistory
      : [];
  return [
    String(cardio.seguimientoHospitalizacion || '').trim(),
    String(cardio.seguimientoConsulta || '').trim(),
    resolveVexusIngreso(cardio, ingresoDate) ?? '',
    resolveDosisInicialDiuretico(cardio),
    computed.balanceAcumuladoMl,
    formatTendenciasResumen(labs),
    formatFasesDosisMaximo(cardio.diureticSegments),
    String(p.nombre || '').trim(),
    String(p.registro || '').trim(),
    ingresoDate,
    computed.diasInternamiento,
    computed.diuresisAcumuladaMl,
    computed.furosemidaAcumuladaMg,
    asOfDate,
    resolveDispositivoLabel(cardio),
    resolveNyhaActual(cardio),
    resolveNtProBnpUltimo(labs),
  ];
}

/**
 * @param {unknown} monitoreo
 * @returns {Map<string, number>}
 */
function diuresisMlByDay(monitoreo) {
  const hist = monitoreo && Array.isArray(monitoreo.historial) ? monitoreo.historial : [];
  /** @type {Map<string, number>} */
  const byDay = new Map();
  for (const row of hist) {
    if (!row || typeof row !== 'object') continue;
    /** @type {any} */
    const r = row;
    const ymd = recordedAtToLocalYmd(r.recordedAt);
    if (!ymd) continue;
    const n = resolveIoDiuresisMl(r.io || {});
    if (n == null) continue;
    byDay.set(ymd, (byDay.get(ymd) || 0) + n);
  }
  return byDay;
}

/**
 * @param {unknown[]} pocus
 * @param {Map<string, number>} balByDay
 * @param {Map<string, number>} diuresisByDay
 * @param {string} ingresoDate
 * @param {string} asOfDate
 */
function collectSeguimientoDays(pocus, balByDay, diuresisByDay, ingresoDate, asOfDate) {
  /** @type {Set<string>} */
  const days = new Set();
  for (const x of pocus) {
    const d = String(x && x.date || '').trim();
    if (d) days.add(d);
  }
  for (const d of balByDay.keys()) days.add(d);
  for (const d of diuresisByDay.keys()) days.add(d);
  if (ingresoDate) days.add(ingresoDate);
  return Array.from(days)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= asOfDate)
    .sort();
}

/**
 * @param {string} day
 * @param {unknown} pocusDay
 * @param {Map<string, number>} balByDay
 * @param {Map<string, number>} diuresisByDay
 * @param {string} dosisActiva
 */
function buildDiarioRow(day, pocusDay, balByDay, diuresisByDay, dosisActiva) {
  /** @type {any} */
  const p = pocusDay;
  return [
    day,
    p && p.vexus != null ? String(p.vexus) : '',
    p && p.congestionScore != null ? String(p.congestionScore) : '',
    balByDay.has(day) ? String(balByDay.get(day)) : '',
    diuresisByDay.has(day) ? String(diuresisByDay.get(day)) : '',
    dosisActiva,
    p && p.note ? String(p.note).trim() : '',
  ];
}

/**
 * @param {unknown} patient
 * @param {{ asOfDate?: string }} [opts]
 * @returns {string[][]}
 */
export function buildSeguimientoDiarioRows(patient, opts = {}) {
  /** @type {any} */
  const p = patient && typeof patient === 'object' ? patient : {};
  ensureCardio(p);
  /** @type {any} */
  const cardio = p.cardio || {};
  const asOfDate = toYmd(opts.asOfDate) || localYmd();
  const ingresoDate = resolveIngresoYmd(p);
  const pocus = Array.isArray(cardio.pocusByDay) ? cardio.pocusByDay : [];
  const balByDay = balanceAcumuladoByDay(p.monitoreo);
  const diuresisByDay = diuresisMlByDay(p.monitoreo);
  const sorted = collectSeguimientoDays(pocus, balByDay, diuresisByDay, ingresoDate, asOfDate);
  const diureticSegs = Array.isArray(cardio.diureticSegments) ? cardio.diureticSegments : [];
  const rows = [];
  for (const day of sorted) {
    const pocusDay = getPocusDay(pocus, day);
    const active = listActiveMeds(diureticSegs).filter((s) => {
      const start = String(s.inicio || '').trim();
      return start && start <= day;
    });
    const dosisActiva = active
      .map((s) => `${String(s.tipo || '').trim()} ${String(s.dosis || '').trim()}`.trim())
      .filter(Boolean)
      .join('; ');
    rows.push(buildDiarioRow(day, pocusDay, balByDay, diuresisByDay, dosisActiva));
  }
  return rows;
}

/**
 * @param {unknown[]} patients
 * @param {{ asOfDate?: string, labHistoryByPatient?: Record<string, unknown[]> }} [opts]
 */
export function buildSeguimientoCohortTsv(patients, opts = {}) {
  const list = Array.isArray(patients) ? patients : [];
  const rows = [];
  for (const patient of list) {
    if (!patient || typeof patient !== 'object') continue;
    /** @type {any} */
    const p = patient;
    const pid = String(p.id || '');
    const labs =
      opts.labHistoryByPatient && pid && Array.isArray(opts.labHistoryByPatient[pid])
        ? opts.labHistoryByPatient[pid]
        : undefined;
    rows.push(
      buildSeguimientoCohortRow(p, {
        asOfDate: opts.asOfDate,
        labHistory: labs,
      }),
    );
  }
  return rowsToTsv(SEGUIMIENTO_COHORT_HEADERS, rows);
}

/**
 * Full export: cohort block + daily block for one patient.
 * @param {unknown} patient
 * @param {{ asOfDate?: string, labHistory?: unknown[] }} [opts]
 */
export function buildSeguimientoFullTsv(patient, opts = {}) {
  const cohortRow = buildSeguimientoCohortRow(patient, opts);
  const diario = buildSeguimientoDiarioRows(patient, opts);
  const parts = [
    '=== SEGUIMIENTO COHORTE (pegar en Google Sheets) ===',
    rowsToTsv(SEGUIMIENTO_COHORT_HEADERS, [cohortRow]),
    '',
    '=== SEGUIMIENTO HOSPITALIZACIÓN DIARIO ===',
    rowsToTsv(SEGUIMIENTO_DIARIO_HEADERS, diario),
  ];
  return parts.join('\n');
}

/**
 * UTF-8 BOM prefix for Excel opening CSV/TSV with Spanish accents.
 * @param {string} tsv
 */
export function withExcelBom(tsv) {
  return '\uFEFF' + tsv;
}
