/**
 * Interpretación de CMI con los puntos de corte de CLSI M100-Ed36 (enero 2026). Solo datos + lógica pura, sin UI.
 * Datos en ./breakpoints/clsi-*.mjs. Solo CMI (mg/L); no hay discos. Citado, no reproducido en bloque.
 * Permiso de uso de CLSI: dueño, 2026-11-09.
 *
 * Regla de seguridad: si hay duda (varias filas posibles, CMI fuera de rango, organismo sin tabla) no se interpreta (null).
 */
import { BP_ENTEROBACTERALES, BP_SALMONELLA_SHIGELLA } from './breakpoints/clsi-enterobacterales.mjs';
import { BP_PSEUDOMONAS, BP_ACINETOBACTER, BP_BURKHOLDERIA, BP_STENOTROPHOMONAS } from './breakpoints/clsi-nofermentadores.mjs';
import { BP_STAPHYLOCOCCUS, BP_ENTEROCOCCUS } from './breakpoints/clsi-grampositivos.mjs';
import { BP_S_PNEUMONIAE, BP_STREP_BETA, BP_STREP_VIRIDANS } from './breakpoints/clsi-estreptococos.mjs';
import { classifyAtbInterp } from './labs-cultivo-atb.mjs';
import { abreviarAbAtb_ } from './labs-cultivo-abbr.mjs';

export const BREAKPOINT_SOURCE = 'CLSI M100, 36.ª ed., enero 2026, Tablas 2A-2H';

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

const ENTERO_RE = /^(ESCHERICHIA|E\.? ?COLI|KLEBSIELLA|K\.? ?(PNEUMONIAE|OXYTOCA|AEROGENES)|ENTEROBACTER|CITROBACTER|PROTEUS|MORGANELLA|PROVIDENCIA|SERRATIA|HAFNIA|RAOULTELLA|YERSINIA|CRONOBACTER|PANTOEA|KLUYVERA|LECLERCIA|EDWARDSIELLA)\b/;
const SALM_RE = /^(SALMONELLA|SHIGELLA)\b/;
const BETA_RE = /^STREPTOCOCCUS (PYOGENES|AGALACTIAE|DYSGALACTIAE|EQUI|CANIS|GRUPO|GROUP)|^(S\.? ?)?(PYOGENES|AGALACTIAE)\b|^ESTREPTOCOCO (BETA|GRUPO)/;

// Orden importa: el primero que coincide gana. [regex, tabla, subgrupo para filas con `esp`]
const GRUPOS = [
  [SALM_RE, BP_SALMONELLA_SHIGELLA],
  [ENTERO_RE, BP_ENTEROBACTERALES],
  [/^(PSEUDOMONAS AERUGINOSA|P\.? ?AERUGINOSA)/, BP_PSEUDOMONAS],
  [/^(ACINETOBACTER|A\.? ?BAUMANNII)/, BP_ACINETOBACTER],
  [/^BURKHOLDERIA CEPACIA/, BP_BURKHOLDERIA],
  [/^STENOTROPHOMONAS MALTOPHILIA|^S\.? ?MALTOPHILIA/, BP_STENOTROPHOMONAS],
  [/^(STAPHYLOCOCCUS|S\.) ?LUGDUNENSIS/, BP_STAPHYLOCOCCUS, 'lugdunensis'],
  [/^(STAPHYLOCOCCUS|S\.) ?AUREUS|^SARM|^MRSA/, BP_STAPHYLOCOCCUS, 'aureus'],
  [/^STAPHYLOCOCCUS/, BP_STAPHYLOCOCCUS, 'scn'],
  [/^(ENTEROCOCCUS|E\.) ?FAECALIS/, BP_ENTEROCOCCUS, 'faecalis'],
  [/^(ENTEROCOCCUS|E\.) ?FAECIUM/, BP_ENTEROCOCCUS, 'faecium'],
  [/^ENTEROCOCCUS/, BP_ENTEROCOCCUS, 'otro'],
  [/^(STREPTOCOCCUS|S\.) ?PNEUMONIAE/, BP_S_PNEUMONIAE],
  [BETA_RE, BP_STREP_BETA],
  [/^STREPTOCOCCUS/, BP_STREP_VIRIDANS],
];

/** → { t: tabla, sp } o null. */
function grupoPara(organismo) {
  const n = norm(organismo).replace(/^[^A-Z]+/, '').replace(/\s+/g, ' ').trim();
  const g = GRUPOS.find((x) => x[0].test(n));
  return g ? { t: g[1], sp: g[2] } : null;
}

/** '<=2', '>16', '0.25', '≤1', '>=8' → { op: '<=' | '<' | '=' | '>' | '>=', v } o null. */
export function parseMic(mic) {
  const m = String(mic == null ? '' : mic)
    .replace(/\s+/g, '')
    .replace('≤', '<=')
    .replace('≥', '>=')
    .replace(',', '.')
    .match(/^(<=|>=|<|>|=)?(\d+(?:\.\d+)?)(?:\/\d+(?:\.\d+)?)?$/);
  return m ? { op: m[1] || '=', v: parseFloat(m[2]) } : null;
}

// "≤v": solo se sabe si v ya cae en S (o bajo r cuando la tabla no tiene S, ej. colistina).
function catMenor(v, s, r, mid) {
  if (s != null && v <= s) return 's';
  return s == null && r != null && v < r ? mid : null;
}

// ">v": solo se sabe si v ya llega a R (o a S cuando la tabla no tiene R: no sensible).
function catMayor(v, s, r) {
  if (r != null && v >= r) return 'r';
  return r == null && s != null && v >= s ? 'ns' : null;
}

function catExacta(v, s, r, mid) {
  if (s != null && v <= s) return 's';
  if (r != null && v >= r) return 'r';
  return r == null ? 'ns' : mid;
}

/** Categoría de una CMI contra una fila: 's' | 'i' | 'sdd' | 'r' | 'ns' | null (no se puede saber). */
export function categoriaMic(mic, fila) {
  const p = typeof mic === 'object' && mic ? mic : parseMic(mic);
  if (!p) return null;
  const mid = fila.mid ? fila.mid.toLowerCase() : null;
  if (p.op === '<=' || p.op === '<') return catMenor(p.v, fila.s, fila.r, mid);
  if (p.op === '>' || p.op === '>=') return catMayor(p.v, fila.s, fila.r);
  return catExacta(p.v, fila.s, fila.r, mid);
}

/**
 * Interpreta una CMI para organismo + antibiótico. → { cat, fila, tabla } o null.
 * opts.orina: usar filas solo-orina si existen; si no, se ignoran.
 */
export function interpretMic(organismo, med, mic, opts = {}) {
  const g = grupoPara(organismo);
  const p = parseMic(mic);
  if (!g || !p) return null;
  const n = norm(med).trim();
  let c = g.t.filas.filter((f) => new RegExp(f.re).test(n));
  // S. lugdunensis: oxacilina y cefoxitina como S. aureus; todo lo demás (ej. vancomicina) como los otros estafilococos.
  const sp = g.sp === 'lugdunensis' ? (/^(OXACILINA|CEFOXITINA)/.test(n) ? 'aureus' : 'scn') : g.sp;
  c = c.filter((f) => !/informativ/i.test(f.nota || '') && (!f.esp || f.esp === sp)); // "I^" informativo no se compara
  if (c.length > 1 && c.some((f) => f.esp === sp)) c = c.filter((f) => f.esp === sp); // fila por especie gana (ej. daptomicina en E. faecium)
  const conOrina = c.filter((f) => f.orina);
  c = opts.orina && conOrina.length ? conOrina : c.filter((f) => !f.orina);
  if (c.length !== 1) return null; // ninguna o ambigua (por vía, especie…)
  const cat = categoriaMic(p, c[0]);
  return cat ? { cat, fila: c[0], tabla: g.t.tabla } : null;
}

const KEY = { s: 's', i: 'i', r: 'r' };

/** ¿La categoría reportada por el laboratorio coincide con la esperada? ns acepta I o R. */
function coincide(esperada, reportada) {
  if (!reportada) return true; // reporte sin S/I/R (ej. "Detectado"): no se compara
  if (esperada === 'ns') return reportada === 'i' || reportada === 'r';
  if (esperada === 'sdd') return reportada === 'i' || reportada === 's';
  return KEY[esperada] === reportada;
}

const ESP = { s: 'S', i: 'I', sdd: 'SDD', r: 'R', ns: 'no S' };

/**
 * Filas del antibiograma cuya interpretación reportada no coincide con CLSI para su CMI.
 * sensRows: [{ med, mic, interp }]. → [{ row, abbr, mic, reportada, esperada, tabla, pag }]
 */
export function flagInterpMismatch(organismo, sensRows, opts = {}) {
  if (!sensRows || !sensRows.length) return [];
  const out = [];
  for (const row of sensRows) {
    const k = classifyAtbInterp(row.interp);
    const it = interpretMic(organismo, row.med, row.mic, opts);
    if (!it || coincide(it.cat, k)) continue;
    if (it.fila.s == null && it.cat === 'i' && k === 's') continue; // sin categoría S en CLSI (colistina): los laboratorios suelen poner S
    out.push({
      row,
      abbr: abreviarAbAtb_(row.med),
      mic: row.mic,
      reportada: String(row.interp || '').trim().toUpperCase(),
      esperada: ESP[it.cat],
      tabla: it.tabla,
      pag: it.fila.pag,
    });
  }
  return out;
}
