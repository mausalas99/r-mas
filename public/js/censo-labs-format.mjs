import { sortLabHistoryChronological } from './tend-core.mjs';
import { splitResLabsByTipo } from './censo-cultivo-format.mjs';
import { formatBhExtrasDisplayLine, isAscitisInterpretacionResLabChunk } from './labs.js';
import { normalizeCensoPanelLine, reflowLabsForCensoDisplay } from './censo-table-style.mjs';

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
  (keys || Object.keys(section)).forEach(function (k) {
    var line = formatLabPair(k, section[k]);
    if (line) parts.push(line);
  });
  return parts;
}

function linesFromRawChunk(chunk) {
  var s = String(chunk || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  return [s];
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
          blockLines.push(panelName + ' · ' + panelLines.join('  '));
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

function pushLabTextLines(lines, text) {
  String(text || '')
    .split(/\r?\n/)
    .forEach(function (subline) {
      var cleaned = subline.replace(/\t/g, ' ').replace(/  +/g, ' ').trim();
      if (cleaned) lines.push(cleaned);
    });
}

function linesFromParsedBySectionFull(pb) {
  var blockLines = [];
  var seen = Object.create(null);
  PANEL_ORDER.forEach(function (panelName) {
    seen[panelName] = true;
    var sec = pb[panelName] || pb[panelName.toLowerCase()];
    if (!sec && panelName === 'OTRO') return;
    var panelLines = linesFromParsedSection(sec, null);
    if (panelLines.length) {
      blockLines.push(panelName + ' · ' + panelLines.join('  '));
    }
  });
  Object.keys(pb).forEach(function (panelName) {
    if (seen[panelName] || seen[panelName.toLowerCase()]) return;
    var sec = pb[panelName];
    if (!sec || typeof sec !== 'object' || Array.isArray(sec)) return;
    var panelLines = linesFromParsedSection(sec, null);
    if (panelLines.length) {
      blockLines.push(panelName + ' · ' + panelLines.join('  '));
    }
  });
  return blockLines;
}

/**
 * Laboratorios del día más reciente: texto completo (sin resumen ni truncado).
 * Cultivos van en su columna; se omiten bloques puramente de cultivo.
 * @param {unknown[]} sets
 * @returns {string[]}
 */
export function formatLabsForCensoCompact(sets) {
  var sorted = sortLabHistoryChronological(sets || []).slice(0, 1);
  if (!sorted.length) return [];

  var set = sorted[0];
  var fecha =
    set.fecha && set.fecha !== 'Anterior' ? String(set.fecha).trim() : '';
  var lines = [];
  if (fecha) lines.push(fecha);

  var sp = splitResLabsByTipo(set.resLabs || []);
  var hasLabChunks = sp.labs.some(function (r) {
    return String(r || '').trim();
  });

  if (hasLabChunks) {
    var bhExtDone = false;
    sp.labs.forEach(function (chunk) {
      if (isAscitisInterpretacionResLabChunk(chunk)) return;
      pushLabTextLines(lines, chunk);
      if (!bhExtDone && set.bhExtras && typeof set.bhExtras === 'object') {
        var ext = formatBhExtrasDisplayLine(set.bhExtras, set.sourceText);
        if (ext) {
          pushLabTextLines(lines, ext);
          bhExtDone = true;
        }
      }
    });
  } else {
    var pb = set.parsedBySection || set.parsed || null;
    if (pb && typeof pb === 'object' && !Array.isArray(pb)) {
      linesFromParsedBySectionFull(pb).forEach(function (ln) {
        lines.push(ln);
      });
    }
  }

  if (!lines.length || (fecha && lines.length === 1)) return [];
  return reflowLabsForCensoDisplay(lines.map(normalizeCensoPanelLine));
}
