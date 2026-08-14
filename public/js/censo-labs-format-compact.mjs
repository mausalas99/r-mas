import { sortLabHistoryChronological } from './tend-core.mjs';
import { splitResLabsByTipo } from './censo-cultivo-format.mjs';
import { formatBhExtrasDisplayLine, isCitoquimInterpretacionResLabChunk } from './labs.js';
import { normalizeCensoPanelLine, reflowLabsForCensoDisplay } from './censo-table-style.mjs';
import { linesFromParsedBySectionFull, pushLabTextLines } from './censo-labs-format-lines.mjs';
import { sanitizeResLabsChunks } from './labs-reslabs-sanitize.mjs';

function appendLabChunks(lines, set, sp) {
  var bhExtDone = false;
  sp.labs.forEach(function (chunk) {
    if (isCitoquimInterpretacionResLabChunk(chunk)) return;
    pushLabTextLines(lines, chunk);
    if (!bhExtDone && set.bhExtras && typeof set.bhExtras === 'object') {
      var ext = formatBhExtrasDisplayLine(set.bhExtras, set.sourceText);
      if (ext) {
        pushLabTextLines(lines, ext);
        bhExtDone = true;
      }
    }
  });
}

function appendParsedSection(lines, set) {
  var pb = set.parsedBySection || set.parsed || null;
  if (!pb || typeof pb !== 'object' || Array.isArray(pb)) return;
  linesFromParsedBySectionFull(pb).forEach(function (ln) {
    lines.push(ln);
  });
}

function appendOneCensoLabSet(lines, set) {
  var cleanResLabs = sanitizeResLabsChunks(set.resLabs || []);
  var sp = splitResLabsByTipo(cleanResLabs);
  var hasLabChunks = sp.labs.some(function (r) {
    return String(r || '').trim();
  });
  if (hasLabChunks) appendLabChunks(lines, set, sp);
  else appendParsedSection(lines, set);
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

/** @param {unknown[]} sets @returns {string[]} */
export function formatLabsForCensoCompactBody(sets) {
  var picked = setsFromLatestCensoDay(sets);
  if (!picked.daySets.length) return [];

  var lines = [];
  if (picked.fecha) lines.push(picked.fecha);
  picked.daySets.forEach(function (set) {
    appendOneCensoLabSet(lines, set);
  });

  if (!lines.length || (picked.fecha && lines.length === 1)) return [];
  return reflowLabsForCensoDisplay(lines.map(normalizeCensoPanelLine));
}
