import { sortLabHistoryChronological } from './tend-core.mjs';
import { splitResLabsByTipo } from './censo-cultivo-format.mjs';
import { isCitoquimInterpretacionResLabChunk } from './labs.js';
import { normalizeCensoPanelLine, reflowLabsForCensoDisplay } from './censo-table-style.mjs';
import { linesFromParsedBySectionFull, pushLabTextLines } from './censo-labs-format-lines.mjs';
import { sanitizeResLabsChunks } from './labs-reslabs-sanitize.mjs';
import { dedupeConsolidatedLabRows } from './lab-bulk-dedupe.mjs';

function appendLabChunks(lines, sp) {
  sp.labs.forEach(function (chunk) {
    if (isCitoquimInterpretacionResLabChunk(chunk)) return;
    pushLabTextLines(lines, chunk);
  });
}

function appendParsedSection(lines, set) {
  var pb = set.parsedBySection || set.parsed || null;
  if (!pb || typeof pb !== 'object' || Array.isArray(pb)) return;
  linesFromParsedBySectionFull(pb).forEach(function (ln) {
    lines.push(ln);
  });
}

function censoDayFecha(set) {
  if (!set || !set.fecha || set.fecha === 'Anterior') return '';
  return String(set.fecha).trim();
}

function setsFromLatestCensoDay(sets) {
  var sorted = sortLabHistoryChronological(sets || []);
  if (!sorted.length) return { fecha: '', daySets: [] };
  var fecha = censoDayFecha(sorted[0]);
  var daySets = fecha
    ? sorted.filter(function (s) {
        return censoDayFecha(s) === fecha;
      })
    : [sorted[0]];
  return { fecha: fecha, daySets: daySets.slice().reverse() };
}

/**
 * Los envíos del día pueden traer estudios repetidos o parciales (ej. dos "sets" separados
 * con el mismo BH/QS/ESC/PFHs). Sin este merge, el censo concatena cada set crudo y duplica
 * el bloque completo en la misma celda — se consolida una sola vez por día, igual que la
 * vista Laboratorio (clusterDayLabSets/dedupeConsolidatedLabRows).
 */
function mergedResLabsForCensoDay_(daySets) {
  var allResLabs = [];
  (daySets || []).forEach(function (set) {
    allResLabs = allResLabs.concat(sanitizeResLabsChunks((set && set.resLabs) || []));
  });
  return dedupeConsolidatedLabRows(allResLabs, 'labs');
}

/** @param {unknown[]} sets @returns {string[]} */
export function formatLabsForCensoCompactBody(sets) {
  var picked = setsFromLatestCensoDay(sets);
  if (!picked.daySets.length) return [];

  var lines = [];
  if (picked.fecha) lines.push(picked.fecha);

  var mergedResLabs = mergedResLabsForCensoDay_(picked.daySets);
  var sp = splitResLabsByTipo(mergedResLabs);
  var hasLabChunks = sp.labs.some(function (r) {
    return String(r || '').trim();
  });
  if (hasLabChunks) {
    appendLabChunks(lines, sp);
  } else {
    picked.daySets.forEach(function (set) {
      appendParsedSection(lines, set);
    });
  }

  if (!lines.length || (picked.fecha && lines.length === 1)) return [];
  return reflowLabsForCensoDisplay(lines.map(normalizeCensoPanelLine));
}
