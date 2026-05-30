import { sortLabHistoryChronological } from './tend-core.mjs';

var PANEL_ORDER = ['BH', 'QS', 'ELECTROLITOS', 'PFHs', 'GASES', 'COAG', 'ORINA', 'OTRO'];

var PANEL_KEYS = {
  BH: ['Hb', 'Hto', 'Leu', 'Neu', 'Linf', 'Plt'],
  QS: ['Glu', 'Cr', 'BUN', 'Na', 'K', 'Cl', 'Ca', 'Mg', 'P'],
  ELECTROLITOS: ['Na', 'K', 'Cl', 'Ca', 'Mg'],
  PFHs: ['Alb', 'TGO', 'TGP', 'BT', 'FA', 'LDH'],
  GASES: ['pH', 'pCO2', 'pO2', 'HCO3', 'Lactato', 'BE'],
  COAG: ['TP', 'TTP', 'INR'],
};

function formatLabPair(key, val) {
  if (val == null || val === '') return '';
  var v = String(val).trim();
  if (!v) return '';
  return key + ' ' + v;
}

function linesFromParsedSection(section, keys) {
  if (!section || typeof section !== 'object') return [];
  var parts = [];
  (keys || Object.keys(section).slice(0, 8)).forEach(function (k) {
    var line = formatLabPair(k, section[k]);
    if (line) parts.push(line);
  });
  return parts;
}

function linesFromRawChunk(chunk) {
  var s = String(chunk || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  if (s.length <= 100) return [s];
  return [s.slice(0, 98) + '…'];
}

/**
 * @param {unknown[]} sets
 * @param {number} [maxDates]
 * @returns {string[]}
 */
export function formatLabsForCenso(sets, maxDates) {
  maxDates = maxDates == null ? 2 : maxDates;
  var sorted = sortLabHistoryChronological(sets || []).slice(0, maxDates);
  if (!sorted.length) return [];

  var out = [];
  sorted.forEach(function (set) {
    var fecha =
      set.fecha && set.fecha !== 'Anterior' ? String(set.fecha).trim() : 'Sin fecha';
    var pb = set.parsedBySection || set.parsed || null;
    var blockLines = [];

    if (pb && typeof pb === 'object' && !Array.isArray(pb)) {
      PANEL_ORDER.forEach(function (panelName) {
        var sec = pb[panelName] || pb[panelName.toLowerCase()];
        if (!sec && panelName === 'OTRO') return;
        var keys = PANEL_KEYS[panelName];
        var panelLines = linesFromParsedSection(sec, keys);
        if (panelLines.length) {
          blockLines.push(panelName + ': ' + panelLines.join('  '));
        }
      });
    }

    if (!blockLines.length) {
      var chunks = (set.resLabs || [])
        .map(function (c) {
          return String(c || '').replace(/\s+/g, ' ').trim();
        })
        .filter(Boolean)
        .slice(0, 2);
      chunks.forEach(function (chunk) {
        linesFromRawChunk(chunk).forEach(function (ln) {
          blockLines.push(ln);
        });
      });
    }

    if (!blockLines.length) return;
    out.push(fecha);
    blockLines.forEach(function (ln) {
      out.push('  ' + ln);
    });
  });

  return out;
}

/**
 * Una sola fecha (la más reciente), paneles en líneas cortas para PDF compacto.
 * @param {unknown[]} sets
 * @returns {string[]}
 */
export function formatLabsForCensoCompact(sets) {
  var sorted = sortLabHistoryChronological(sets || []).slice(0, 1);
  if (!sorted.length) return [];

  var set = sorted[0];
  var fecha =
    set.fecha && set.fecha !== 'Anterior' ? String(set.fecha).trim() : '';
  var pb = set.parsedBySection || set.parsed || null;
  var panels = [];

  if (pb && typeof pb === 'object' && !Array.isArray(pb)) {
    PANEL_ORDER.forEach(function (panelName) {
      var sec = pb[panelName] || pb[panelName.toLowerCase()];
      if (!sec && panelName === 'OTRO') return;
      var keys = PANEL_KEYS[panelName];
      var bits = linesFromParsedSection(sec, keys);
      if (bits.length) panels.push(panelName + ' ' + bits.join(' '));
    });
  }

  if (!panels.length) {
    var raw = (set.resLabs || [])
      .map(function (c) {
        return String(c || '').replace(/\s+/g, ' ').trim();
      })
      .filter(Boolean)
      .join(' ');
    if (raw) panels.push(raw.length > 220 ? raw.slice(0, 218) + '…' : raw);
  }

  if (!panels.length) return [];
  var lines = [];
  if (fecha) lines.push(fecha);
  panels.forEach(function (panel) {
    lines.push(panel);
  });
  return lines;
}
