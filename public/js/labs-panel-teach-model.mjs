/**
 * Teach wizard model: draft rows ↔ PanelDef ↔ preview lines (pure).
 */
import { parsePanelDef_ } from './labs-panel-parse.mjs';

var KNOWN_LABEL_KEYS = {
  'T4 LIBRE': 'T4L',
  'HEMOGLOBINA GLICOSILADA': 'HbA1c',
  TSH: 'TSH',
  'T3 LIBRE': 'T3L',
  FERRITINA: 'Ferr',
  'NT-PROBNP': 'NTproBNP',
};

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/\p{M}/gu, '');
}

function fallbackKeyFromLabel(label) {
  var cleaned = stripAccents(label).replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  var parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Field';
  var key = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  for (var i = 1; i < parts.length && key.length < 12; i++) {
    var word = parts[i];
    key += word.charAt(0).toUpperCase() + (word.length > 1 ? word.slice(1).toLowerCase() : '');
  }
  return key.slice(0, 12);
}

export function suggestKeyFromLabel(label) {
  var upper = String(label || '').trim().toUpperCase();
  if (KNOWN_LABEL_KEYS[upper]) return KNOWN_LABEL_KEYS[upper];
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
