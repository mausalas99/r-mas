/**
 * Union BH compact fields across same-cluster rows (CBC + Ret from another study).
 */
import {
  flattenBhHemOnlyVisible,
  mergeCoagResLabRows_,
  parseBhTrendValuesFromResLab,
} from './labs-bh.mjs';
import { lineRichnessScore_ } from './labs-gaso-section.mjs';

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

function formatBhMergedCompactLine_(byField) {
  var pairs = [];
  BH_COMPACT_MERGE_ORDER_.forEach(function (fk) {
    var disp = formatBhMergedCell_(byField[fk]);
    if (!disp) return;
    pairs.push(fk, disp);
  });
  if (!pairs.length) return '';
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

  var compact = formatBhMergedCompactLine_(collectBhCompactFields_(list));
  if (compact) return { bh: compact, coag: coag };

  var best = pickRichestBhLine_(list);
  var lines = best.split(/\r?\n/).filter(function (line) {
    return !/^(?:\s*Coag\.|COAG)\t/i.test(line.trim());
  });
  return { bh: lines.join('\n').trim(), coag: coag };
}
