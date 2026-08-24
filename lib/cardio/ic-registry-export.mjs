/**
 * Export `patient.cardio` data into rows matching the exact column order of
 * `IC_REGISTRY_HEADERS` (the HF unit research registry .xlsx). Additive,
 * read-only — does not touch the existing Hoja IC docx export.
 *
 * Design note on ambiguous headers: several headers repeat verbatim within
 * one visit block (bare "Dosis" appears ~10 times per block — once per drug
 * class). Header text alone cannot say which drug a given "Dosis" column
 * means, so every bare "Dosis" column is left blank everywhere rather than
 * guessing which drug it belongs to. Same policy for "TAPSE/PSAP (0 = Normal,
 * 1 = Bajo)" (no documented threshold for Normal/Bajo) and "Patrón Pulmonar"/
 * "Fenotipo de IC" (different clinical axis than what the app stores).
 */

import { IC_REGISTRY_HEADERS } from './ic-registry-headers.mjs';
import { ensureCardio } from './patient-cardio.mjs';
import { normalizeEvaluacionInicial } from './evaluacion-inicial.mjs';
import { toYmd, resolveIngresoYmd } from './ic-export-payload-dates.mjs';
import { daysBetweenInclusive } from './descongestion.mjs';
import { sumFurosemidaMg } from './med-segments.mjs';
import { withExcelBom } from './seguimiento-sheets.mjs';
import { CAUSA_REINGRESO, CAUSA_MUERTE } from './hf-enums.mjs';

export { withExcelBom };

const ECO_MARKER_RE = /^ECO\s+\d+\s*cita/i;
const TMO_MARKER_RE = /^TMO\s+\d+\s*cita/i;

/**
 * Tag every header with its visit index (0 = baseline, before the first
 * "ECO N cita" marker; 1..N = the Nth visit block). Blocks are NOT uniformly
 * wide, so this is a real left-to-right scan, not an assumed fixed stride.
 * @param {string[]} headers
 * @returns {number[]}
 */
export function tagColumnsByVisit(headers) {
  const tags = new Array(headers.length);
  let visitIndex = 0;
  for (let i = 0; i < headers.length; i += 1) {
    if (ECO_MARKER_RE.test(headers[i])) visitIndex += 1;
    tags[i] = visitIndex;
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Small enum/code helpers
// ---------------------------------------------------------------------------

/** @param {unknown} v */
export function boolCode(v) {
  if (v === true) return '1';
  if (v === false) return '0';
  return '';
}

/** @param {string} label @param {{value:string,label:string}[]} list */
function codeFromEnumList(label, list) {
  const s = String(label || '').trim();
  if (!s) return '';
  const idx = list.findIndex((o) => o.value === s || o.label === s);
  return idx >= 0 ? String(idx) : '';
}

/** @param {unknown} label */
export function causaReingresoCode(label) {
  return codeFromEnumList(String(label || ''), CAUSA_REINGRESO);
}

/** @param {unknown} label */
export function causaMuerteCode(label) {
  return codeFromEnumList(String(label || ''), CAUSA_MUERTE);
}

// xlsx: 1 = isquémica, 2 = HTA, 3 = MCD no isquémica, 4 = Valvular,
// 5 = TaquiCMP, 6 = Infiltrativa, 7 = otra. The app's ETIOLOGIAS list is a
// finer-grained clinical taxonomy — this is a real re-coding onto the
// coarser xlsx scale, not a guess: each app category maps to the closest
// xlsx bucket it was clinically split out of.
const ETIOLOGIA_CODE_BY_LABEL = {
  Isquémica: '1',
  Hipertensiva: '2',
  'Miocardiopatía dilatada idiopática': '3',
  'Miocardiopatía hipertrófica': '3',
  Chagásica: '3',
  'Miocarditis/inflamatoria': '3',
  Periparto: '3',
  'Congénita del adulto': '3',
  Alcohólica: '3',
  'Tóxica quimioterapia': '3',
  Valvular: '4',
  Taquicardiomiopatía: '5',
  Amiloidosis: '6',
  Otra: '7',
};

/** @param {unknown} label */
export function etiologiaCode(label) {
  return ETIOLOGIA_CODE_BY_LABEL[String(label || '').trim()] || '';
}

// xlsx: 1 = sinusal, 2 = aFib, 3 = Flutter, 4 = estimulado.
const RITMO_CODE_BY_LABEL = {
  Sinusal: '1',
  'Fibrilación auricular': '2',
  'Flutter auricular': '3',
  'Ritmo de marcapasos': '4',
};

/** @param {unknown} label */
export function ritmoCode(label) {
  return RITMO_CODE_BY_LABEL[String(label || '').trim()] || '';
}

// xlsx: 1 = ritmo, 2 = frecuencia.
const ESTRATEGIA_CODE_BY_LABEL = {
  'Control de ritmo': '1',
  'Control de frecuencia': '2',
};

/** @param {unknown} label */
export function estrategiaCode(label) {
  return ESTRATEGIA_CODE_BY_LABEL[String(label || '').trim()] || '';
}

// xlsx: 0 = no BB, 1 = Bisoprolol, 2 = Carvedilol, 3 = Metoprolol.
const BB_CODE_BY_DRUG = { Bisoprolol: '1', Carvedilol: '2', Metoprolol: '3' };
/** @param {unknown} drug */
function betabloqueadorCode(drug) {
  const d = String(drug || '').trim();
  if (!d) return '0';
  return BB_CODE_BY_DRUG[d] || '';
}

// xlsx: 0 = ninguno, 1 = IECA, 2 = ARA, 3 = ARNI.
const IECA_DRUGS = ['Enalapril', 'Lisinopril', 'Ramipril'];
const ARA_DRUGS = ['Losartán', 'Valsartán', 'Candesartán'];
const ARNI_DRUGS = ['Sacubitril/Valsartán', 'Neparvis'];
/** @param {unknown} drug */
function iecaAraArniCode(drug) {
  const d = String(drug || '').trim();
  if (!d) return '0';
  if (ARNI_DRUGS.includes(d)) return '3';
  if (ARA_DRUGS.includes(d)) return '2';
  if (IECA_DRUGS.includes(d)) return '1';
  return '';
}

// xlsx: 0 = no, 1 = a espiro(nolactona), 2 = eple(renona), 3 = Fine(renona).
const ARM_CODE_BY_DRUG = { Espironolactona: '1', Eplerenona: '2', Finerenona: '3' };
/** @param {unknown} drug */
function armCode(drug) {
  const d = String(drug || '').trim();
  if (!d) return '0';
  return ARM_CODE_BY_DRUG[d] || '';
}

// xlsx: 0 = no, 1 = Dapa, 2 = Empa.
const SGLT2_CODE_BY_DRUG = { Dapagliflozina: '1', Empagliflozina: '2' };
/** @param {unknown} drug */
function sglt2Code(drug) {
  const d = String(drug || '').trim();
  if (!d) return '0';
  return SGLT2_CODE_BY_DRUG[d] || '';
}

// xlsx: 0 = no, 1 = Riva, 2 = apixa, 3 = dabi, 4 = Warfa.
const ACO_CODE_MATCHERS = [
  [/rivaroxab/i, '1'],
  [/apixab/i, '2'],
  [/dabigatr/i, '3'],
  [/warfarina/i, '4'],
];
/** @param {unknown} text */
function acoCodeFromText(text) {
  const s = String(text || '');
  for (const [re, code] of ACO_CODE_MATCHERS) {
    if (re.test(s)) return code;
  }
  return '';
}

// xlsx: 0 = minima, 1 = media, 2 = máxima (free-text dosisTitulada field).
/** @param {unknown} text */
function titulacionCode(text) {
  const s = String(text || '').toLowerCase();
  if (!s.trim()) return '';
  if (/m[aá]xim/.test(s)) return '2';
  if (/med/.test(s)) return '1';
  if (/m[ií]nim/.test(s)) return '0';
  return '';
}

// ---------------------------------------------------------------------------
// Date / active-segment helpers
// ---------------------------------------------------------------------------

/** @param {unknown} ymd */
function isValidYmd(ymd) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''));
}

/**
 * Segments active on `date` (inicio <= date <= endedAt, or no endedAt).
 * @param {any[]} segments
 * @param {string} date
 */
function activeSegmentsAsOf(segments, date) {
  const list = Array.isArray(segments) ? segments : [];
  return list.filter((s) => {
    if (!s) return false;
    const inicio = toYmd(s.inicio);
    if (!inicio || inicio > date) return false;
    const ended = toYmd(s.endedAt);
    if (ended && ended < date) return false;
    return true;
  });
}

/**
 * Fantásticos pillar rows have no `endedAt` — treat as active once started.
 * @param {any[]} fantasticos
 * @param {string} className
 * @param {string} date
 */
function fantasticoActiveAsOf(fantasticos, className, date) {
  const list = Array.isArray(fantasticos) ? fantasticos : [];
  const row = list.find((f) => f && f.className === className);
  if (!row || !String(row.drug || '').trim()) return null;
  const inicio = toYmd(row.inicio);
  if (inicio && inicio > date) return null;
  return row;
}

/** @param {any[]} segments @param {string} date @param {RegExp} re */
function findActiveDrug(segments, date, re) {
  return activeSegmentsAsOf(segments, date).find((s) => re.test(String(s.tipo || '')));
}

// ---------------------------------------------------------------------------
// Baseline resolvers (keyed by the exact baseline header string — every
// baseline header is unique except bare "Dosis", which is intentionally
// excluded so it stays blank rather than guessing which drug it names).
// ---------------------------------------------------------------------------

/** @param {any} echoStudies */
function earliestEcho(echoStudies) {
  const list = (Array.isArray(echoStudies) ? echoStudies : []).filter((e) => e && isValidYmd(toYmd(e.date)));
  if (!list.length) return null;
  return list.slice().sort((a, b) => toYmd(a.date).localeCompare(toYmd(b.date)))[0];
}

/** @param {any} echoStudies */
function latestEcho(echoStudies) {
  const list = (Array.isArray(echoStudies) ? echoStudies : []).filter((e) => e && isValidYmd(toYmd(e.date)));
  if (!list.length) return null;
  return list.slice().sort((a, b) => toYmd(a.date).localeCompare(toYmd(b.date)))[list.length - 1];
}

/** @param {any[]} labSnapshots */
function latestLabSnapshot(labSnapshots) {
  const list = (Array.isArray(labSnapshots) ? labSnapshots : []).filter((s) => s && isValidYmd(toYmd(s.date)));
  if (!list.length) return null;
  return list.slice().sort((a, b) => toYmd(a.date).localeCompare(toYmd(b.date)))[list.length - 1];
}

/**
 * NT-proBNP tomas 1-4: evaluacionInicial's ingreso value first (dated by its
 * `fecha`), then labSnapshots in date order, one toma per non-null value.
 * @param {any} evaluacionInicial
 * @param {any[]} labSnapshots
 */
function ntProBnpTomas(evaluacionInicial, labSnapshots) {
  /** @type {{date:string, value:unknown}[]} */
  const tomas = [];
  const ingresoVal = evaluacionInicial && evaluacionInicial.labsIngreso && evaluacionInicial.labsIngreso.ntProBnp;
  if (ingresoVal != null && ingresoVal !== '') {
    tomas.push({ date: toYmd(evaluacionInicial.fecha), value: ingresoVal });
  }
  const sorted = (Array.isArray(labSnapshots) ? labSnapshots : [])
    .filter((s) => s && isValidYmd(toYmd(s.date)) && s.values && s.values.ntProBnp != null && s.values.ntProBnp !== '')
    .slice()
    .sort((a, b) => toYmd(a.date).localeCompare(toYmd(b.date)));
  for (const s of sorted) tomas.push({ date: toYmd(s.date), value: s.values.ntProBnp });
  return tomas.slice(0, 4);
}

/**
 * Earliest consulta with `reingresoHospitalario === true` — used for the
 * reingreso-window flags and "Causa del reingreso" baseline columns.
 * @param {any[]} consultas
 */
function firstReingresoConsulta(consultas) {
  const list = (consultas || []).filter((c) => c && c.reingresoHospitalario === true && isValidYmd(toYmd(c.date)));
  if (!list.length) return null;
  return list.slice().sort((a, b) => toYmd(a.date).localeCompare(toYmd(b.date)))[0];
}

/** @param {any[]} consultas */
function firstMuerteConsulta(consultas) {
  const list = (consultas || []).filter((c) => c && c.muerte === true && isValidYmd(toYmd(c.date)));
  if (!list.length) return null;
  return list.slice().sort((a, b) => toYmd(a.date).localeCompare(toYmd(b.date)))[0];
}

/**
 * Days from admission to `eventYmd`, 0-based (same day = 0). Null when either
 * date is missing/invalid — callers must not force a window flag in that case.
 * @param {string} admissionYmd
 * @param {string} eventYmd
 */
function daysSinceAdmission(admissionYmd, eventYmd) {
  if (!isValidYmd(admissionYmd) || !isValidYmd(eventYmd)) return null;
  const inclusive = daysBetweenInclusive(admissionYmd, eventYmd);
  return inclusive > 0 ? inclusive - 1 : null;
}

/**
 * boolCode for a day-count window, but only when the event date is known —
 * an unknown reingreso/muerte date must leave every window blank, never '0'
 * (a blank patient-wide "never reingresó" can't be told apart from "we don't
 * know the date" from the data alone, so we don't claim either).
 * @param {number|null} days
 * @param {number} minInclusive
 * @param {number|null} maxInclusive
 */
function windowFlag(days, minInclusive, maxInclusive) {
  if (days == null) return '';
  const inWindow = days >= minInclusive && (maxInclusive == null || days <= maxInclusive);
  return inWindow ? '1' : '0';
}

/** @param {(patient: any, ctx: any) => unknown} fn */
function baseline(fn) {
  return fn;
}

/** @type {Record<string, (patient: any, ctx: any) => unknown>} */
const BASELINE_RESOLVERS = {
  'Nombre ': baseline((p) => p.nombre),
  Registro: baseline((p) => p.registro),
  Años: baseline((p) => p.edad),
  '# cita': baseline((_p, ctx) => ctx.usedConsultas.length),
  'FEVI BASAL': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.fevi : ctx.evaluacionInicial.ultimaFevi)),
  'Última cita': baseline((_p, ctx) => (ctx.lastConsulta ? ctx.lastConsulta.date : '')),
  Contacto: baseline((_p, ctx) => (ctx.lastConsulta ? ctx.lastConsulta.contacto : '')),
  'TA basal ': baseline((_p, ctx) => ctx.evaluacionInicial.exploracion.ta),
  'Reingreso 0-30 días': baseline((_p, ctx) => windowFlag(ctx.reingresoDays, 0, 30)),
  'Reingreso 30-60 días': baseline((_p, ctx) => windowFlag(ctx.reingresoDays, 31, 60)),
  'Reingreso 60-90 días': baseline((_p, ctx) => windowFlag(ctx.reingresoDays, 61, 90)),
  'Reingreso >90 días': baseline((_p, ctx) => windowFlag(ctx.reingresoDays, 91, null)),
  'Causa del reingreso (0 = Congestión, 1 = bajo gasto, 2 = Congestión + bajo gasto, 3 = Infección, 4 = Arritmia, 5 = SICA, 6 = programado, 7= otros)':
    baseline((_p, ctx) => (ctx.reingresoConsulta ? causaReingresoCode(ctx.reingresoConsulta.causaReingreso) : '')),
  'Muerte ( 0= insuficiencia cardiaca, 1=causas cardiovasculares, 2= otras causas)': baseline((_p, ctx) =>
    ctx.muerteConsulta ? causaMuerteCode(ctx.muerteConsulta.causaMuerte) : '',
  ),
  'Muerte 30 días': baseline((_p, ctx) => windowFlag(ctx.muerteDays, 0, 30)),
  'Muerte 60 días': baseline((_p, ctx) => windowFlag(ctx.muerteDays, 0, 60)),
  'Muerte 90 días': baseline((_p, ctx) => windowFlag(ctx.muerteDays, 0, 90)),
  'Muerte 1 año': baseline((_p, ctx) => windowFlag(ctx.muerteDays, 0, 365)),
  'Muerte 2 años': baseline((_p, ctx) => windowFlag(ctx.muerteDays, 0, 730)),
  'Especificar causa de muerte': baseline((_p, ctx) => (ctx.muerteConsulta ? ctx.muerteConsulta.causaMuerteNota : '')),
  'Ntprobnp Fecha 1a toma ': baseline((_p, ctx) => (ctx.ntProBnpTomas[0] ? ctx.ntProBnpTomas[0].date : '')),
  'Valores 1a toma (ng/L)': baseline((_p, ctx) => (ctx.ntProBnpTomas[0] ? ctx.ntProBnpTomas[0].value : '')),
  'Fecha 2a toma': baseline((_p, ctx) => (ctx.ntProBnpTomas[1] ? ctx.ntProBnpTomas[1].date : '')),
  'Valores 2a toma (ng/L)': baseline((_p, ctx) => (ctx.ntProBnpTomas[1] ? ctx.ntProBnpTomas[1].value : '')),
  'Fecha 3a toma': baseline((_p, ctx) => (ctx.ntProBnpTomas[2] ? ctx.ntProBnpTomas[2].date : '')),
  'Valores 3a toma (ng/L)': baseline((_p, ctx) => (ctx.ntProBnpTomas[2] ? ctx.ntProBnpTomas[2].value : '')),
  'Fecha 4ta toma': baseline((_p, ctx) => (ctx.ntProBnpTomas[3] ? ctx.ntProBnpTomas[3].date : '')),
  'Valores 4ta toma (ng/L)': baseline((_p, ctx) => (ctx.ntProBnpTomas[3] ? ctx.ntProBnpTomas[3].value : '')),
  '% cambio': baseline((_p, ctx) => {
    const first = Number(ctx.ntProBnpTomas[0] && ctx.ntProBnpTomas[0].value);
    const tail = ctx.ntProBnpTomas[ctx.ntProBnpTomas.length - 1];
    const last = tail ? Number(tail.value) : NaN;
    if (ctx.ntProBnpTomas.length < 2 || !Number.isFinite(first) || first === 0 || !Number.isFinite(last)) return '';
    return String(((last - first) / first) * 100);
  }),
  'Etiología (1 = isquémica, 2 = HTA, 3 = MCD no isquémica, 4 = Valvular, 5 = TaquiCMP, 6 = Infiltrativa, 7 = otra)':
    baseline((p, ctx) => etiologiaCode(p.etiologia || ctx.cardio.etiologia)),
  'Primer internamiento': baseline((p) => resolveIngresoYmd(p)),
  'ultimo ingreso(Fecha)': baseline((_p, ctx) => {
    const list = ctx.usedConsultas
      .filter((c) => c && isValidYmd(toYmd(c.ultimoInternamientoFecha)))
      .slice()
      .sort((a, b) => toYmd(a.ultimoInternamientoFecha).localeCompare(toYmd(b.ultimoInternamientoFecha)));
    return list.length ? toYmd(list[list.length - 1].ultimoInternamientoFecha) : '';
  }),
  'Ritmo  inicial (1 = sinusal, 2 = aFib, 3 = Flutter, 4 = estimulado)': baseline((_p, ctx) => ritmoCode(ctx.cardio.ritmo)),
  'Estrategia de control (1 = ritmo, 2 = frecuencia)': baseline((_p, ctx) => estrategiaCode(ctx.cardio.estrategiaControlFa)),
  'Indicación de TRC (0 = no, 1 = si)': baseline((_p, ctx) =>
    boolCode(ctx.device.indicacion === 'TRC por QRS ancho + FEVI reducida'),
  ),
  'ECO BASAL (Fecha)': baseline((_p, ctx) => (ctx.earliestEcho ? toYmd(ctx.earliestEcho.date) : '')),
  'FEVI ': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.fevi : '')),
  'ITVmax ': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.itVmax : '')),
  'Gradiente reverso VT': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.gradienteReversoVt : '')),
  'vena cava': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.vciMm : '')),
  'Colapso Inspiratorio ': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.vciColapso : '')),
  'Presión aurícula derecha': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.pad : '')),
  PSAP: baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.psap : '')),
  TAPSE: baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.tapse : '')),
  'TAPSE/PSAP': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.tapsePsap : '')),
  'S´del VD': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.sVd : '')),
  'VExUS (0,1,2,3': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.vexus : '')),
  'Septum IV (SIVd)': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.septumIvd : '')),
  PPVI: baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.ppvid : '')),
  GPR: baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.gpr : '')),
  'Vol AI index (Laesv index)': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.volAiIndex : '')),
  'VFDVI 4C': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.vfdvi : '')),
  'VFSVI 4C': baseline((_p, ctx) => (ctx.earliestEcho ? ctx.earliestEcho.vfsvi : '')),
  'Betabloqueador (0 = no BB, 1 = Bisoprolol, 2 = Carvedilol, 3 = Metoprolol)': baseline((_p, ctx) =>
    betabloqueadorCode(ctx.pillar('Betabloqueador').drug),
  ),
  'Dosis de BB (si la dosis se da mas de una vez al día, poner dosis diaria)': baseline(
    (_p, ctx) => ctx.pillar('Betabloqueador').dosis,
  ),
  'IECA/ARA/ARNI (0 = ninguno, 1, 2 o 3 respectivamente)': baseline((_p, ctx) =>
    iecaAraArniCode(ctx.pillar('IECA/ARA/ARNI').drug),
  ),
  'IECA/ARA (Especificar)': baseline((_p, ctx) => {
    const drug = ctx.pillar('IECA/ARA/ARNI').drug;
    return ARNI_DRUGS.includes(String(drug || '')) ? '' : drug;
  }),
  'Dosis (IECA/ARA/ARNI)': baseline((_p, ctx) => ctx.pillar('IECA/ARA/ARNI').dosis),
  'ARM (0 = no, 1 = a espiro, 2 = eple, 3 = Fine)': baseline((_p, ctx) => armCode(ctx.pillar('MRA').drug)),
  'iSGLT2 (0 = no, 1 = Dapa, 2 = Empa)': baseline((_p, ctx) => sglt2Code(ctx.pillar('SGLT2i').drug)),
  'Vericiguat (0 = no, 1 = si)': baseline((_p, ctx) => boolCode(!!findActiveDrug(ctx.cardio.medSegments, ctx.today, /vericiguat/i))),
  'Digoxina (0 = no, 1 = si)': baseline((_p, ctx) => boolCode(!!findActiveDrug(ctx.cardio.medSegments, ctx.today, /digoxina/i))),
  'Dinitrato (0 = no, 1 = si)': baseline((_p, ctx) => boolCode(!!findActiveDrug(ctx.cardio.medSegments, ctx.today, /dinitrato/i))),
  'Hidralazina (0 = no, 1 = si)': baseline((_p, ctx) =>
    boolCode(!!findActiveDrug(ctx.cardio.medSegments, ctx.today, /hidralazina/i)),
  ),
  'Amiodarona (0= no, 1 = si)': baseline((_p, ctx) => boolCode(!!findActiveDrug(ctx.cardio.medSegments, ctx.today, /amiodarona/i))),
  'Ivabradina (0 = no, 1 = si)': baseline((_p, ctx) => boolCode(!!findActiveDrug(ctx.cardio.medSegments, ctx.today, /ivabradina/i))),
  'ACO (0 = no, 1 = Riva, 2 = apixa, 3 = dabi, 4 = Warfa)': baseline((_p, ctx) => {
    const active = activeSegmentsAsOf(ctx.cardio.medSegments, ctx.today).find((s) => acoCodeFromText(s.tipo));
    if (active) return acoCodeFromText(active.tipo);
    return acoCodeFromText(ctx.evaluacionInicial.tratamientoPrevio.anticoagulante) || '0';
  }),
  'Dosis acumulada de diurético al alta (Intravenosa)': baseline((_p, ctx) =>
    sumFurosemidaMg(ctx.cardio.diureticSegments, ctx.today) || '',
  ),
  'NT-proBNP basal': baseline(
    (_p, ctx) => ctx.evaluacionInicial.labsIngreso.ntProBnp ?? ctx.evaluacionInicial.ultimoNtProBnp ?? '',
  ),
  'Creat al alta': baseline((_p, ctx) => (ctx.latestLabSnapshot ? ctx.latestLabSnapshot.values.cr : '')),
  'Na alta': baseline((_p, ctx) => (ctx.latestLabSnapshot ? ctx.latestLabSnapshot.values.na : '')),
  'K alta': baseline((_p, ctx) => (ctx.latestLabSnapshot ? ctx.latestLabSnapshot.values.k : '')),
  'BT alta': baseline((_p, ctx) => (ctx.latestLabSnapshot ? ctx.latestLabSnapshot.values.bilTotal : '')),
};

// ---------------------------------------------------------------------------
// Per-visit resolvers — keyed by the RAW header text as it appears in a
// visit block. Deliberately NOT stripping the trailing "(...)" here: doing
// so collapses "TAPSE/PSAP" and "TAPSE/PSAP (0 = Normal, 1 = Bajo)" into one
// key even though they need different values, so raw text is the safe key.
// A handful of header variants drift slightly between blocks (typos in the
// source sheet, e.g. "Congrestión" vs "Congestión", or an extra "7= otros"
// bucket); each observed variant gets its own entry pointing at the same
// resolver so the drift doesn't silently blank those columns out.
// ---------------------------------------------------------------------------

/** @param {any[]} labSnapshots @param {string} date */
function findLabsForDate(labSnapshots, date) {
  return (labSnapshots || []).find((s) => s && toYmd(s.date) === date) || null;
}

/** @param {any[]} echoStudies @param {string} date */
function findEchoForDate(echoStudies, date) {
  return (echoStudies || []).find((e) => e && toYmd(e.date) === date) || null;
}

/** @param {(ctx: any) => unknown} fn */
function perVisit(fn) {
  return fn;
}

const echoField = (key) => perVisit((ctx) => (ctx.echo ? ctx.echo[key] : ''));

const reingresoCausaResolver = perVisit((ctx) => causaReingresoCode(ctx.consulta.causaReingreso));
const ta90Resolver = perVisit((ctx) => {
  const ta = Number(ctx.consulta.ta);
  if (!Number.isFinite(ta)) return '';
  return boolCode(ta < 90);
});
const ta90InvertedResolver = perVisit((ctx) => {
  const ta = Number(ctx.consulta.ta);
  if (!Number.isFinite(ta)) return '';
  return boolCode(!(ta < 90));
});

/** @type {Record<string, (ctx: any) => unknown>} */
const PER_VISIT_RESOLVERS = {
  'FEVI ': echoField('fevi'),
  'FEVI recuperada (0 = no, 1 = si)': perVisit((ctx) => (ctx.echo ? boolCode(ctx.echo.feviRecuperada) : '')),
  'ITVmax ': echoField('itVmax'),
  'Gradiente reverso VT': echoField('gradienteReversoVt'),
  'vena cava': echoField('vciMm'),
  'Colapso Inspiratorio ': echoField('vciColapso'),
  'Presión aurícula derecha': echoField('pad'),
  PSAP: echoField('psap'),
  TAPSE: echoField('tapse'),
  'TAPSE/PSAP': echoField('tapsePsap'),
  "S´del VD": echoField('sVd'),
  'VExUS (0,1,2,3': echoField('vexus'),
  'JV valsalva': echoField('jvValsalva'),
  'JV espiración': echoField('jvEspiracion'),
  'JVD ratio': echoField('jvdRatio'),
  'JVD ratio <4 (0 = no, 1 = si)': perVisit((ctx) => {
    const v = ctx.echo ? Number(ctx.echo.jvdRatio) : NaN;
    return Number.isFinite(v) ? boolCode(v < 4) : '';
  }),
  'JVD ratio <2 (0 = no, 1 = si)': perVisit((ctx) => {
    const v = ctx.echo ? Number(ctx.echo.jvdRatio) : NaN;
    return Number.isFinite(v) ? boolCode(v < 2) : '';
  }),
  'Septum IV': echoField('septumIvd'),
  PPVI: echoField('ppvid'),
  GPR: echoField('gpr'),
  'Vol AI index': echoField('volAiIndex'),
  'VFDVI 4C': echoField('vfdvi'),
  'VFSVI 4C': echoField('vfsvi'),
  'Betabloqueador (0 = no BB, 1 = Bisoprolol, 2 = Carvedilol, 3 = Metoprolol)': perVisit((ctx) =>
    betabloqueadorCode(ctx.pillarActive('Betabloqueador')),
  ),
  'Dosis de BB (si la dosis se da mas de una vez al día, poner dosis diaria)': perVisit(
    (ctx) => ctx.pillarActiveDosis('Betabloqueador'),
  ),
  'IECA/ARA/ARNI (0 = ninguno, 1, 2 o 3 respectivamente)': perVisit((ctx) =>
    iecaAraArniCode(ctx.pillarActive('IECA/ARA/ARNI')),
  ),
  'IECA/ARA (Especificar)': perVisit((ctx) => {
    const drug = ctx.pillarActive('IECA/ARA/ARNI');
    return ARNI_DRUGS.includes(String(drug || '')) ? '' : drug;
  }),
  'Dosis (IECA/ARA/ARNI)': perVisit((ctx) => ctx.pillarActiveDosis('IECA/ARA/ARNI')),
  'ARM (0 = no, 1 = a espiro, 2 = eple, 3 = Fine)': perVisit((ctx) => armCode(ctx.pillarActive('MRA'))),
  'iSGLT2 (0 = no, 1 = Dapa, 2 = Empa)': perVisit((ctx) => sglt2Code(ctx.pillarActive('SGLT2i'))),
  'Vericiguat (0 = no, 1 = si)': perVisit((ctx) => boolCode(!!findActiveDrug(ctx.medSegments, ctx.consulta.date, /vericiguat/i))),
  'Digoxina (0 = no, 1 = si)': perVisit((ctx) => boolCode(!!findActiveDrug(ctx.medSegments, ctx.consulta.date, /digoxina/i))),
  'Dinitrato (0 = no, 1 = si)': perVisit((ctx) => boolCode(!!findActiveDrug(ctx.medSegments, ctx.consulta.date, /dinitrato/i))),
  'Hidralazina (0 = no, 1 = si)': perVisit((ctx) => boolCode(!!findActiveDrug(ctx.medSegments, ctx.consulta.date, /hidralazina/i))),
  'Amiodarona (0= si, 1 = no)': perVisit((ctx) => boolCode(!!findActiveDrug(ctx.medSegments, ctx.consulta.date, /amiodarona/i))),
  'Ivabradina (0 = no, 1 = si)': perVisit((ctx) => boolCode(!!findActiveDrug(ctx.medSegments, ctx.consulta.date, /ivabradina/i))),
  'ACO (0 = no, 1 = Riva, 2 = apixa, 3 = dabi, 4 = Warfa)': perVisit((ctx) => {
    const active = activeSegmentsAsOf(ctx.medSegments, ctx.consulta.date).find((s) => acoCodeFromText(s.tipo));
    return active ? acoCodeFromText(active.tipo) : '';
  }),
  'Score TMO': perVisit((ctx) => (ctx.consulta.scoreTmo != null ? ctx.consulta.scoreTmo : '')),
  Creat: perVisit((ctx) => (ctx.labs ? ctx.labs.values.cr : '')),
  Na: perVisit((ctx) => (ctx.labs ? ctx.labs.values.na : '')),
  'K ': perVisit((ctx) => (ctx.labs ? ctx.labs.values.k : '')),
  'BT ': perVisit((ctx) => (ctx.labs ? ctx.labs.values.bilTotal : '')),
  TA: perVisit((ctx) => (ctx.consulta.ta != null ? ctx.consulta.ta : '')),
  'Reingreso hospitalario (0 = no, 1 = 0)': perVisit((ctx) => boolCode(ctx.consulta.reingresoHospitalario)),
  'Causa del reingreso (0 = Congrestión, 1 = bajo gasto, 2 = Congestión + bajo gasto, 3 = Infección, 4 = Arritmia, 5 = SICA, 6 = programado)':
    reingresoCausaResolver,
  'Causa del reingreso (0 = Congrestión, 1 = bajo gasto, 2 = Congestión + bajo gasto, 3 = Infección, 4 = Arritmia, 5 = SICA, 6 = programado, 7= otros)':
    reingresoCausaResolver,
  'NT-proBNP seguimiento': perVisit((ctx) => (ctx.labs ? ctx.labs.values.ntProBnp : '')),
  'Dosis BB (0 = minima, 1 = media, 2 = máxima)': perVisit((ctx) => titulacionCode(ctx.consulta.dosisTitulada?.bb)),
  'Dosis IECA/ARA/ARNI  (0 = minima, 1 = media, 2 = máxima)': perVisit((ctx) =>
    titulacionCode(ctx.consulta.dosisTitulada?.iecaAraArni),
  ),
  'Dosis ARM (0 = minima, 1 = media, 2 = máxima)': perVisit((ctx) => titulacionCode(ctx.consulta.dosisTitulada?.arm)),
  'Dosis ISGLT2 (0 = minima, 1 = media, 2 = máxima)': perVisit((ctx) => titulacionCode(ctx.consulta.dosisTitulada?.isglt2)),
  'BB/ARNI/ARM/iSGLT2 dosis máxima (0 = no, 1 = si)': perVisit((ctx) => boolCode(ctx.consulta.bbArniArmSglt2DosisMaxima)),
  'Tiempo a la implementación (Semanas)': perVisit((ctx) =>
    ctx.consulta.tiempoImplementacionSemanas != null ? ctx.consulta.tiempoImplementacionSemanas : '',
  ),
  '<90/60': ta90Resolver,
  '<90/60 (0 = no, 1 = si)': ta90Resolver,
  '< 90/60': ta90Resolver,
  '<90/60 (0 = si, 1 = no)': ta90InvertedResolver,
  'Implementación Completa (0 = no, 1 = si)': perVisit((ctx) => boolCode(ctx.consulta.implementacionCompleta)),
  'Mal apego (0 = no, 1 = si)': perVisit((ctx) => boolCode(ctx.consulta.malApego)),
};

// ---------------------------------------------------------------------------
// Row assembly
// ---------------------------------------------------------------------------

const TAGS = tagColumnsByVisit(IC_REGISTRY_HEADERS);
const ECO_START = TAGS.findIndex((t) => t === 1);
const NUM_VISITS = Math.max(...TAGS);

/**
 * @param {unknown} patient
 * @returns {{ row: string[], truncatedVisits: number }}
 */
export function buildIcRegistryRow(patient) {
  /** @type {any} */
  const p = patient && typeof patient === 'object' ? patient : {};
  ensureCardio(p);
  /** @type {any} */
  const cardio = p.cardio;
  const echoStudies = Array.isArray(cardio.echoStudies) ? cardio.echoStudies : [];
  const labSnapshots = Array.isArray(cardio.labSnapshots) ? cardio.labSnapshots : [];
  const evaluacionInicial = normalizeEvaluacionInicial(cardio.evaluacionInicial);
  const allConsultas = (Array.isArray(cardio.consultas) ? cardio.consultas : [])
    .filter((c) => c && isValidYmd(toYmd(c.date)))
    .slice()
    .sort((a, b) => toYmd(a.date).localeCompare(toYmd(b.date)));
  const usedConsultas = allConsultas.slice(0, NUM_VISITS);
  const truncatedVisits = Math.max(0, allConsultas.length - NUM_VISITS);

  const reingresoConsulta = firstReingresoConsulta(usedConsultas);
  const admissionYmd = resolveIngresoYmd(p);
  const muerteConsulta = firstMuerteConsulta(usedConsultas);

  const pillarFor = (className) => {
    const list = Array.isArray(cardio.fantasticos) ? cardio.fantasticos : [];
    return list.find((f) => f && f.className === className) || { drug: '', dosis: '' };
  };

  const baselineCtx = {
    cardio,
    evaluacionInicial,
    usedConsultas,
    lastConsulta: usedConsultas[usedConsultas.length - 1] || null,
    earliestEcho: earliestEcho(echoStudies),
    latestEcho: latestEcho(echoStudies),
    latestLabSnapshot: latestLabSnapshot(labSnapshots),
    ntProBnpTomas: ntProBnpTomas(evaluacionInicial, labSnapshots),
    reingresoConsulta,
    reingresoDays: reingresoConsulta ? daysSinceAdmission(admissionYmd, toYmd(reingresoConsulta.date)) : null,
    muerteConsulta,
    muerteDays: muerteConsulta ? daysSinceAdmission(admissionYmd, toYmd(muerteConsulta.date)) : null,
    device: cardio.device || {},
    pillar: pillarFor,
    today: toYmd(new Date().toISOString().slice(0, 10)),
  };

  const row = new Array(IC_REGISTRY_HEADERS.length).fill('');

  for (let i = 0; i < ECO_START; i += 1) {
    const resolver = BASELINE_RESOLVERS[IC_REGISTRY_HEADERS[i]];
    if (typeof resolver !== 'function') continue;
    const v = resolver(p, baselineCtx);
    row[i] = v == null ? '' : String(v);
  }

  for (let i = ECO_START; i < IC_REGISTRY_HEADERS.length; i += 1) {
    const header = IC_REGISTRY_HEADERS[i];
    const visitIdx = TAGS[i];
    const consulta = usedConsultas[visitIdx - 1];
    if (!consulta) continue;

    if (ECO_MARKER_RE.test(header)) {
      const echo = findEchoForDate(echoStudies, consulta.date);
      row[i] = echo ? toYmd(echo.date) : '';
      continue;
    }
    if (TMO_MARKER_RE.test(header)) {
      row[i] = consulta.date;
      continue;
    }

    const resolver = PER_VISIT_RESOLVERS[header];
    if (typeof resolver !== 'function') continue;

    const echo = findEchoForDate(echoStudies, consulta.date);
    const labs = findLabsForDate(labSnapshots, consulta.date);
    const ctx = {
      consulta,
      echo,
      labs,
      patient: p,
      medSegments: cardio.medSegments,
      pillarActive: (className) => {
        const row2 = fantasticoActiveAsOf(cardio.fantasticos, className, consulta.date);
        return row2 ? row2.drug : '';
      },
      pillarActiveDosis: (className) => {
        const row2 = fantasticoActiveAsOf(cardio.fantasticos, className, consulta.date);
        return row2 ? row2.dosis : '';
      },
    };
    const v = resolver(ctx);
    row[i] = v == null ? '' : String(v);
  }

  return { row, truncatedVisits };
}

/**
 * @param {unknown[]} patients
 * @returns {{ headers: string[], rows: string[][], truncatedByPatient: Record<string, number> }}
 */
export function buildIcRegistryRows(patients) {
  const list = Array.isArray(patients) ? patients : [];
  /** @type {string[][]} */
  const rows = [];
  /** @type {Record<string, number>} */
  const truncatedByPatient = {};
  for (const patient of list) {
    if (!patient || typeof patient !== 'object') continue;
    /** @type {any} */
    const p = patient;
    const { row, truncatedVisits } = buildIcRegistryRow(p);
    rows.push(row);
    if (truncatedVisits > 0) truncatedByPatient[String(p.id || '')] = truncatedVisits;
  }
  return { headers: IC_REGISTRY_HEADERS.slice(), rows, truncatedByPatient };
}

/** @param {unknown} cell */
function escCsvCell(cell) {
  const s = cell == null ? '' : String(cell);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {string[]} headers
 * @param {string[][]} rows
 */
export function rowsToCsv(headers, rows) {
  const lines = [headers.map(escCsvCell).join(',')];
  for (const row of rows) lines.push(row.map(escCsvCell).join(','));
  return lines.join('\r\n');
}
