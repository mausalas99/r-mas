/**
 * Union BH compact fields across same-cluster rows (CBC + Ret from another study).
 */
import {
  flattenBhHemOnlyVisible,
  mergeCoagResLabRows_,
  parseBhTrendValuesFromResLab,
} from './labs-bh.mjs';
import { lineRichnessScore_ } from './labs-gaso-section.mjs';
import { computeRetiCorregido_ } from './labs-reticulocito-corregido.mjs';

var BH_COMPACT_MERGE_ORDER_ = ['Hb', 'Hto', 'VCM', 'HCM', 'Ret', 'Leu', 'Neu', 'Eos', 'Plt'];

function extractCoagBodyFromBhLine_(line) {
  var m = String(line || '').match(/^(?:COAG|Coag\.?)\t(.+)/i);
  return m ? m[1].trim() : '';
}

function pairListToDisplay_(pairs) {
  var out = [];
  for (var i = 0; i < pairs.length; i += 2) {
    if (pairs[i + 1] !== undefined) out.push(pairs[i] + ' ' + pairs[i + 1]);
  }
  return out.join('  ');
}

function formatBhMergedCell_(cell) {
  if (!cell || cell.val == null || String(cell.val).trim() === '') return '';
  var v = String(cell.val);
  if (cell.ab && v.indexOf('*') < 0) v += '*';
  return v;
}

function collectBhCompactFields_(rows) {
  var byField = Object.create(null);
  (rows || []).forEach(function (row) {
    var cells = parseBhTrendValuesFromResLab(flattenBhHemOnlyVisible(row));
    BH_COMPACT_MERGE_ORDER_.forEach(function (fk) {
      if (byField[fk] || !cells[fk]) return;
      byField[fk] = cells[fk];
    });
  });
  return byField;
}

var RETC_TOKEN_RE_ = /\bRetC\s+([\d.]+\s*\((?:arregenerativa|regenerativa)\))/i;

/** Una fila ya puede traer RetC calculado con un Hto/Ret prestado de otra toma
 * (no mostrado en su propia línea) — si el merge no puede recalcular porque
 * esta fila es la única del cluster, se reutiliza ese valor en vez de perderlo. */
function findExistingRetCToken_(rows) {
  for (var i = 0; i < (rows || []).length; i++) {
    var m = RETC_TOKEN_RE_.exec(String(rows[i] || ''));
    if (m) return m[1];
  }
  return null;
}

/** RetC depende de Hto y Ret, que pueden llegar de filas distintas al fusionar — se recalcula aquí cuando ambos están disponibles tras el merge. */
function insertRetCPair_(pairs, byField, rows) {
  var hto = byField.Hto && byField.Hto.val;
  var ret = byField.Ret && byField.Ret.val;
  var retC = null;
  if (hto != null && ret != null) {
    var computed = computeRetiCorregido_(ret, hto);
    if (computed !== '---') retC = computed;
  }
  if (!retC) retC = findExistingRetCToken_(rows);
  if (!retC) return;
  var retIdx = pairs.indexOf('Ret');
  pairs.splice(retIdx >= 0 ? retIdx + 2 : pairs.length, 0, 'RetC', retC);
}

function formatBhMergedCompactLine_(byField, rows) {
  var pairs = [];
  BH_COMPACT_MERGE_ORDER_.forEach(function (fk) {
    var disp = formatBhMergedCell_(byField[fk]);
    if (!disp) return;
    pairs.push(fk, disp);
  });
  if (!pairs.length) return '';
  insertRetCPair_(pairs, byField, rows);
  return 'BH\t' + pairListToDisplay_(pairs);
}

function pickRichestBhLine_(list) {
  var best = list[0];
  var bestScore = lineRichnessScore_(best);
  for (var i = 1; i < list.length; i++) {
    var sc = lineRichnessScore_(list[i]);
    if (sc > bestScore) {
      bestScore = sc;
      best = list[i];
    }
  }
  return best;
}

/** Une varias filas BH del mismo cluster (biometría + Ret/dif de otra solicitud). */
export function mergeBhResLabRows_(rows) {
  var list = (rows || [])
    .map(function (r) {
      return String(r == null ? '' : r);
    })
    .filter(function (s) {
      return /^BH\b/i.test(s.trim());
    });
  if (!list.length) return { bh: '', coag: '' };

  var coagRows = [];
  list.forEach(function (row) {
    String(row)
      .split(/\r?\n/)
      .forEach(function (line) {
        if (extractCoagBodyFromBhLine_(line)) coagRows.push(line);
      });
  });
  var coag = mergeCoagResLabRows_(coagRows);

  var compact = formatBhMergedCompactLine_(collectBhCompactFields_(list), list);
  if (compact) return { bh: compact, coag: coag };

  var best = pickRichestBhLine_(list);
  var lines = best.split(/\r?\n/).filter(function (line) {
    return !/^(?:\s*Coag\.|COAG)\t/i.test(line.trim());
  });
  return { bh: lines.join('\n').trim(), coag: coag };
}
