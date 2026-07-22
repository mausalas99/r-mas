/**
 * Teach wizard model: draft rows ↔ PanelDef ↔ preview lines (pure).
 */
import { parsePanelDef_ } from './labs-panel-parse.mjs';

/** Universal short keys used in R+ compact lines / tendencias. */
var KNOWN_LABEL_KEYS = {
  'T4 LIBRE': 'T4L',
  'HEMOGLOBINA GLICOSILADA': 'HbA1c',
  TSH: 'TSH',
  'T3 LIBRE': 'T3L',
  FERRITINA: 'Ferr',
  'NT-PROBNP': 'NTproBNP',
  HCT: 'Hto',
  HEMATOCRITO: 'Hto',
  HTO: 'Hto',
  HGB: 'Hb',
  HEMOGLOBINA: 'Hb',
  MCV: 'VCM',
  VCM: 'VCM',
  MCH: 'HCM',
  HCM: 'HCM',
  MCHC: 'CHCM',
  CHCM: 'CHCM',
  RDW: 'RDW',
  WBC: 'Leu',
  LEUCOCITOS: 'Leu',
  'NEU%': 'Neu%',
  'NEUTROFILOS %': 'Neu%',
  NEU: 'Neu',
  NEUTROFILOS: 'Neu',
  LYM: 'Lin',
  LINFOCITOS: 'Lin',
  'LYM%': 'Lin%',
  MONO: 'Mono',
  MONOCITOS: 'Mono',
  'MONO%': 'Mono%',
  'EOS%': 'Eos%',
  EOSINOFILOS: 'Eos',
  PLT: 'Plt',
  PLAQUETAS: 'Plt',
  'CALCIO EN SUERO': 'Ca',
  CALCIO: 'Ca',
  'FOSFORO EN SANGRE': 'P',
  FOSFORO: 'P',
  'FÓSFORO': 'P',
  MAGNESIO: 'Mg',
  SODIO: 'Na',
  POTASIO: 'K',
  CLORO: 'Cl',
  'GLUCOSA EN SANGRE': 'Glu',
  GLUCOSA: 'Glu',
  CREATININA: 'Cr',
  'BILIRRUBINA TOTAL': 'BT',
  'BILIRRUBINA DIRECTA': 'BD',
  'BILIRRUBINA INDIRECTA': 'BI',
  'LDH DESHIDROGENASA LACTICA': 'LDH',
  'LDH DESHIDROGENASA LAC': 'LDH',
  'LACTATO DESHIDROGENASA': 'LDH',
  LDH: 'LDH',
  AMILASA: 'Amil',
  'AMILASA SERICA': 'Amil',
  LIPASA: 'Lip',
  COLESTEROL: 'COL',
  TRIGLICERIDOS: 'TGL',
  'TRIGLICÉRIDOS': 'TGL',
  ALBUMINA: 'Alb',
  'ALBÚMINA': 'Alb',
  'FOSFATASA ALCALINA': 'FA',
  'ALP FOSFATASA ALCALINA': 'FA',
  'PROTEINA C REACTIVA': 'PCR',
  'PROTEÍNA C REACTIVA': 'PCR',
  'ACIDO URICO': 'AU',
  'ÁCIDO ÚRICO': 'AU',
};

var STOP_WORDS = {
  EN: 1,
  DE: 1,
  DEL: 1,
  LA: 1,
  EL: 1,
  LOS: 1,
  LAS: 1,
  SERICO: 1,
  SERICA: 1,
  SANGRE: 1,
  SUERO: 1,
  TOTAL: 1,
  DIRECTA: 1,
  INDIRECTA: 1,
};

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeLabelKey(label) {
  return stripAccents(String(label || ''))
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackKeyFromLabel(label) {
  var cleaned = stripAccents(label).replace(/[^a-zA-Z0-9%]+/g, ' ').trim();
  var parts = cleaned.split(/\s+/).filter(function (p) {
    return p && !STOP_WORDS[p.toUpperCase()];
  });
  if (!parts.length) return 'Campo';
  if (parts.length === 1) {
    var w = parts[0];
    if (/^[A-Z0-9%]{1,6}$/i.test(w)) {
      return w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
    }
    return w.slice(0, 4).charAt(0).toUpperCase() + w.slice(1, 4).toLowerCase();
  }
  // Multi-word → short acronym (max 4 letters)
  var acro = parts
    .slice(0, 4)
    .map(function (p) {
      return p.charAt(0).toUpperCase();
    })
    .join('');
  return acro.slice(0, 4) || 'Campo';
}

export function suggestKeyFromLabel(label) {
  var upper = normalizeLabelKey(label);
  if (KNOWN_LABEL_KEYS[upper]) return KNOWN_LABEL_KEYS[upper];
  // Longest substring match among known SOME labels.
  var keys = Object.keys(KNOWN_LABEL_KEYS);
  var best = '';
  var bestKey = '';
  for (var j = 0; j < keys.length; j++) {
    var cand = keys[j];
    if (cand.length < 3) continue;
    if (upper.indexOf(cand) >= 0 && cand.length > best.length) {
      best = cand;
      bestKey = KNOWN_LABEL_KEYS[cand];
    }
  }
  if (bestKey) return bestKey;
  return fallbackKeyFromLabel(label);
}

export function candidatesToDraftRows(candidates) {
  return (candidates || []).map(function (c) {
    var label = c.label || '';
    return {
      included: c.selected !== false,
      label: label,
      key: c.key || suggestKeyFromLabel(label),
      value: c.value || '',
      min: c.min,
      max: c.max,
      mode: c.qual ? 'qual' : 'num',
      qual: c.qual || '',
      sco: c.sco || '',
    };
  });
}

export function draftRowsToPanelDef(rows, meta) {
  meta = meta || {};
  var mode = meta.mode || 'num';
  var fields = (rows || []).filter(function (r) { return r.included; }).map(function (r) {
    if (mode === 'qual') {
      return { key: r.key, patterns: [new RegExp(escapeRe(r.label), 'i')] };
    }
    return { key: r.key, labels: [r.label].concat(r.extraLabels || []).filter(Boolean) };
  });
  var gates = (meta.gates && meta.gates.length)
    ? meta.gates.map(function (g) { return new RegExp(escapeRe(g), 'i'); })
    : fields.map(function (f) {
      var gateText = f.labels ? f.labels[0] : f.key;
      return new RegExp(escapeRe(gateText), 'i');
    });
  return { sectionKey: meta.sectionKey, mode: mode, gates: gates, fields: fields };
}

export function previewLinesFromDraft(rows, meta, texto) {
  var def = draftRowsToPanelDef(rows, meta);
  var line = parsePanelDef_(def, texto);
  return line ? [line] : [];
}
