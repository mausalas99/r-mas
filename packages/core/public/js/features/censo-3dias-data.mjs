/** Pure data builder for the Guardia "Labs 3 días" table (no DOM, no storage). */
import { sortLabHistoryChronological, getSetTrendValueForSeries, trendDayKey } from '../tend-core.mjs';
import { isVitalAltered } from './estado-actual-ranges.mjs';
import { listManualLabTypes } from '../labs-manual-catalog.mjs';
import { sortResLabsByClinicalOrder } from '../labs-section-order.mjs';

// Seed ranges for the first 18 analytes; every other catalog analyte shows ref "—".
// ref: [min, max] inclusive; lt: value must be strictly below max. s/f = tend catalog section/field keys.
export const CENSO_3D_LABS = [
  { label: 'Hb', unit: 'g/dL', ref: '12–16', min: 12, max: 16, s: 'BH', f: 'Hb' },
  { label: 'Hematócrito', unit: '%', ref: '36–46', min: 36, max: 46, s: 'BH', f: 'Hto' },
  { label: 'Leucocitos', unit: '×10³/µL', ref: '4–11', min: 4, max: 11, s: 'BH', f: 'Leu' },
  { label: 'Plaquetas', unit: '×10³/µL', ref: '150–400', min: 150, max: 400, s: 'BH', f: 'Plt' },
  { label: 'Glucosa', unit: 'mg/dL', ref: '70–110', min: 70, max: 110, s: 'QS', f: 'Glu' },
  { label: 'Urea', unit: 'mg/dL', ref: '15–45', min: 15, max: 45, s: 'QS', f: 'BUN' },
  { label: 'Creatinina', unit: 'mg/dL', ref: '0.6–1.2', min: 0.6, max: 1.2, s: 'QS', f: 'Cr' },
  { label: 'Sodio', unit: 'mmol/L', ref: '135–145', min: 135, max: 145, s: 'ESC', f: 'Na' },
  { label: 'Potasio', unit: 'mmol/L', ref: '3.5–5.0', min: 3.5, max: 5, s: 'ESC', f: 'K' },
  { label: 'Calcio', unit: 'mg/dL', ref: '8.5–10.5', min: 8.5, max: 10.5, s: 'ESC', f: 'Ca' },
  { label: 'Albúmina', unit: 'g/dL', ref: '3.5–5.0', min: 3.5, max: 5, s: 'PFHs', f: 'Alb' },
  { label: 'Bilirrubina total', unit: 'mg/dL', ref: '0.2–1.2', min: 0.2, max: 1.2, s: 'PFHs', f: 'BT' },
  { label: 'TGO', unit: 'U/L', ref: '<40', max: 40, lt: true, s: 'PFHs', f: 'AST' },
  { label: 'TGP', unit: 'U/L', ref: '<41', max: 41, lt: true, s: 'PFHs', f: 'ALT' },
  { label: 'INR', unit: '', ref: '0.8–1.2', min: 0.8, max: 1.2, s: 'BH', f: 'INR' },
  { label: 'PCR', unit: 'mg/L', ref: '<10', max: 10, lt: true, s: 'QS', f: 'PCR' },
  { label: 'Procalcitonina', unit: 'ng/mL', ref: '<0.5', max: 0.5, lt: true, s: 'QS', f: 'PCT' },
  { label: 'Lactato', unit: 'mmol/L', ref: '0.5–2.0', min: 0.5, max: 2, s: 'GASES', f: 'Lactato' },
];

/** Every catalog analyte (section order, then catalog field order); CENSO_3D_LABS keeps its range and extras. */
function buildUniverse() {
  const types = listManualLabTypes();
  const fieldsBySec = new Map(); // upper section -> {s, items[]}
  types.forEach((t) => fieldsBySec.set(t.sectionKey.toUpperCase(), { s: t.sectionKey, items: t.fields.map((fl) => ({ s: t.sectionKey, f: fl.key, label: fl.label })) }));
  const seed = new Map(CENSO_3D_LABS.map((c) => [c.s.toUpperCase() + '|' + c.f, c]));
  CENSO_3D_LABS.forEach((c) => { // seed analytes the catalog lacks: append to their section
    const sec = fieldsBySec.get(c.s.toUpperCase()) || (fieldsBySec.set(c.s.toUpperCase(), { s: c.s, items: [] }), fieldsBySec.get(c.s.toUpperCase()));
    if (!sec.items.some((i) => i.f === c.f)) sec.items.push({ s: sec.s, f: c.f, label: c.label });
  });
  const order = sortResLabsByClinicalOrder([...fieldsBySec.values()].map((v) => v.s));
  const out = [];
  order.forEach((s) => fieldsBySec.get(s.toUpperCase()).items.forEach((i) => {
    const c = seed.get(s.toUpperCase() + '|' + i.f);
    out.push(c || { label: i.label, unit: '', ref: '—', s: i.s, f: i.f });
  }));
  return out;
}
export const CENSO_3D_UNIVERSE = buildUniverse();

function labAltered(spec, n) {
  if (spec.lt) return n >= spec.max;
  return n < spec.min || n > spec.max;
}

const fmt = (n) => String(n);

/** parsedBySection key matching `s` case-insensitively (PFHs vs PFHS). */
function sectionKeyIn(set, s) {
  const pb = set && set.parsedBySection;
  if (!pb || pb[s]) return s;
  const up = s.toUpperCase();
  return Object.keys(pb).find((k) => k.toUpperCase() === up) || s;
}

function threeDayCell(hist, spec) {
  const seen = new Set();
  const out = [];
  for (const set of sortLabHistoryChronological(hist)) { // newest first
    const n = getSetTrendValueForSeries(set, sectionKeyIn(set, spec.s), spec.f);
    if (n == null) continue;
    const day = trendDayKey(set);
    if (seen.has(day)) continue;
    seen.add(day);
    out.push({ text: fmt(n), alt: labAltered(spec, n) });
    if (out.length === 3) break;
  }
  return out.reverse();
}

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

function vitalCell(key, vitals) {
  const v = vitals || {};
  if (key === 'ta') {
    const s = num(v.tas);
    if (s == null) return { text: '—', alt: false };
    const d = num(v.tad);
    return { text: s + (d == null ? '' : '/' + d), alt: s > 130 || isVitalAltered('tas', s) || (d != null && d > 85) };
  }
  const n = num(v[key]);
  return n == null ? { text: '—', alt: false } : { text: fmt(n), alt: isVitalAltered(key, n) };
}

export const CENSO_3D_VITALS = [
  { label: 'FC', unit: 'lpm', ref: '60–100', key: 'fc' },
  { label: 'FR', unit: 'rpm', ref: '12–20', key: 'fr' },
  { label: 'T/A', unit: 'mmHg', ref: '≤130/85', key: 'ta' },
  { label: 'SatO₂', unit: '%', ref: '≥94', key: 'sat' },
  { label: 'Temp', unit: '°C', ref: '36–37.5', key: 'temp' },
];

/**
 * @param {object[]} patients
 * @param {{ getHist: (id: string) => object[], getVitals: (p: object) => object }} deps
 */
export function buildCenso3dModel(patients, { getHist, getVitals }) {
  const hists = patients.map((p) => getHist(p.id) || []);
  const vit = patients.map((p) => getVitals(p));
  return {
    // Only rows where at least one bed on this page has a value.
    labs: CENSO_3D_UNIVERSE.map((spec) => ({
      label: spec.label, unit: spec.unit, ref: spec.ref, section: spec.s, f: spec.f,
      cells: hists.map((h) => threeDayCell(h, spec)),
    })).filter((r) => r.cells.some((c) => c.length)),
    vitals: CENSO_3D_VITALS.map((spec) => ({
      label: spec.label, unit: spec.unit, ref: spec.ref,
      cells: vit.map((v) => vitalCell(spec.key, v)),
    })),
  };
}
