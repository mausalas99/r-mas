/**
 * Cultivos para censo: mismo texto que «Copiar informe completo» (formatCultivoCondensedForCopy).
 */
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
} from './tend-core.mjs';
import {
  formatCultivoCondensedForCopy,
  isParsedCultivoHeaderLine,
  parseCuentaFromCultivoChunkLines,
} from './labs.js';

function buildLabSetDateLine(set) {
  if (!set) return '';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim();
  var rawHora = normalizeHoraLabHistory(set.hora);
  if (!rawDate) return '';
  return rawHora ? rawDate + ' ' + rawHora.slice(0, 5) : rawDate;
}

function isLabSectionHeaderLine(s) {
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS)\b/i.test(String(s).trim());
}

function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (/^CULTIVO\b/i.test(t)) return true;
  if (isParsedCultivoHeaderLine(t)) return true;
  if (/^BACTERIOLOGIA\b/i.test(t)) return true;
  if (/^UROCULTIVO\b/i.test(t)) return true;
  if (/^HEMOCULTIVO\b/i.test(t)) return true;
  if (/^FUNGICULTIVO\b/i.test(t)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(t)) return true;
  if (/^BACILOSCOPIA\b/i.test(t)) return true;
  if (/^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(t)) return true;
  if (/^CATETER\b/i.test(t)) return true;
  if (/^ATB\b/i.test(t)) return true;
  if (/^Cuenta:/i.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  if (/^Cultivos$/i.test(t)) return true;
  return false;
}

export function splitResLabsByTipo(rows) {
  var labs = [];
  var cultivo = [];
  var inCultivo = false;
  (rows || []).forEach(function (row) {
    var raw = row == null ? '' : row;
    var s = String(raw).trim();
    if (isLabSectionHeaderLine(s)) {
      inCultivo = false;
      labs.push(raw);
      return;
    }
    if (inCultivo) {
      cultivo.push(raw);
      return;
    }
    if (isCultivoBlockStartLine(s)) {
      inCultivo = true;
      cultivo.push(raw);
      return;
    }
    labs.push(raw);
  });
  return { labs: labs, cultivo: cultivo };
}

var CENSO_MAX_CULTIVO_REPORTS = 3;

function isCultureTableHeaderLine(t) {
  return isParsedCultivoHeaderLine(t);
}

function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || '').replace(/\s+/g, ' ').trim();
  var beforeColon = (s.split(':')[0] || s).toUpperCase();
  if (/^HEMOCULTIVO\b/.test(beforeColon)) return 'hemo';
  if (/^UROCULTIVO\b/.test(beforeColon)) return 'uro';
  if (/^FUNGICULTIVO\b/.test(beforeColon)) return 'fungi';
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return 'gram';
  if (/^CATETER\b/.test(beforeColon)) return 'cateter';
  return 'otro';
}

function completePartialFechaForCultivo(dm, set) {
  if (!dm) return '';
  var parts = String(dm).trim().split('/');
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    var joined = parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = new Date().getFullYear();
  if (set && set.fecha && set.fecha !== 'Anterior') {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, '');
    if (typeof ms === 'number' && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y;
}

function cultureBlockLooksNegative(left, right) {
  var L = (left + ' ' + right).toUpperCase();
  if (!String(right || '').trim()) return true;
  return (
    /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(
      L
    )
  );
}

function parseCultureBlockFromLineArray(lines, set, seq) {
  var rawHeader = String(lines[0] || '');
  var line = rawHeader.replace(/\s+/g, ' ').trim();
  var tipoKey = classifyCultureTipoKeyFromHeaderLine(rawHeader);
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs !== 'number' || !isFinite(sortMs)) sortMs = 0;

  var colon = line.indexOf(':');
  var left = colon >= 0 ? line.slice(0, colon).trim() : line;
  var right = colon >= 0 ? line.slice(colon + 1).trim() : '';

  var fechaMuestra = '';
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (dm) {
    fechaMuestra = completePartialFechaForCultivo(dm[1], set);
    sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, '').trim();
  }

  var organismo = right.replace(/\s+/g, ' ').trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = 'Negativo';
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = 'Negativo';
  else if (!organismo) organismo = '—';

  var bodyLines = lines.slice(1);
  var cuenta = parseCuentaFromCultivoChunkLines(bodyLines);

  var sortKeyMs = sortMs;
  if (fechaMuestra) {
    var fmNorm = normalizeFechaLabHistory(fechaMuestra) || fechaMuestra;
    var fmParsed = parseFechaLabToMs(fmNorm, '');
    if (typeof fmParsed === 'number' && isFinite(fmParsed)) sortKeyMs = fmParsed;
  }

  return {
    row: {
      fechaMuestra: fechaMuestra || '—',
      sitio: sitio || '—',
      organismo: organismo,
      cuenta: cuenta || '',
      negativo: negativo,
      sortMs: sortMs,
      sortKeyMs: sortKeyMs,
      tipoKey: tipoKey,
      labSetId: set && set.id != null ? set.id : '',
      _seq: typeof seq === 'number' ? seq : 0,
    },
  };
}

function extractCultivoTableRowsFromLabHistory(history) {
  var rows = [];
  var seq = 0;
  sortLabHistoryChronological(history || []).forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = splitResLabsByTipo(set.resLabs).cultivo;
    cult.forEach(function (chunk) {
      var sections = String(chunk || '')
        .split(/\n\n+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      sections.forEach(function (sec) {
        var lines = sec.split(/\r?\n/).map(function (l) {
          return l.replace(/\*+$/g, '').trim();
        }).filter(function (l) {
          return l;
        });
        if (!lines.length) return;
        if (!isCultureTableHeaderLine(lines[0])) return;
        rows.push(parseCultureBlockFromLineArray(lines, set, seq++).row);
      });
    });
  });
  return rows;
}

/** Mismo criterio que modo Pase / tabla de cultivos. */
function filterCultivoRowsSignificantFlip(rows) {
  function seriesKey(r) {
    return (
      (r.tipoKey || 'otro') +
      '\x01' +
      String(r.sitio || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
  var bySeries = Object.create(null);
  rows.forEach(function (r) {
    var k = seriesKey(r);
    if (!bySeries[k]) bySeries[k] = [];
    bySeries[k].push(r);
  });
  var out = [];
  Object.keys(bySeries).forEach(function (k) {
    var arr = bySeries[k].slice().sort(function (a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return da - db;
      return (a._seq || 0) - (b._seq || 0);
    });
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (!r.negativo) {
        out.push(r);
        continue;
      }
      var prev = arr[i - 1];
      var next = arr[i + 1];
      if ((prev && !prev.negativo) || (next && !next.negativo)) out.push(r);
    }
  });
  return out;
}

function germHintFromCultivoHeadLine(headLine) {
  var line = String(headLine || '').replace(/\s+/g, ' ').trim();
  var colon = line.lastIndexOf(':');
  if (colon >= 0) {
    var right = line.slice(colon + 1).trim();
    if (right) return right;
  }
  return line;
}

function germQueryFromCultivoChunkHead(headLine) {
  var h = germHintFromCultivoHeadLine(headLine);
  var base = h.split(/\s*·\s*/)[0].trim();
  return base || h;
}

function findCultivoChunkInSet(set, organismoQuery) {
  if (!set || !set.resLabs) return null;
  var q = String(organismoQuery || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!q || q === '—') return null;
  var cult = splitResLabsByTipo(set.resLabs).cultivo;
  for (var ei = 0; ei < cult.length; ei++) {
    var chunks = String(cult[ei] || '')
      .split(/\n\n+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    for (var ci = 0; ci < chunks.length; ci++) {
      var head = chunks[ci].split(/\n/)[0] || '';
      var gq = germQueryFromCultivoChunkHead(head)
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
      if (!gq) continue;
      if (gq === q || gq.indexOf(q) !== -1 || q.indexOf(gq) !== -1) return chunks[ci];
      var gTok = gq.split(/\s+/).filter(Boolean)[0] || '';
      var qTok = q.split(/\s+/).filter(Boolean)[0] || '';
      if (
        gTok.length > 3 &&
        qTok.length > 3 &&
        (gTok === qTok || gq.indexOf(qTok) === 0 || q.indexOf(gTok) === 0)
      ) {
        return chunks[ci];
      }
    }
  }
  return null;
}

/**
 * @param {unknown[]} labHistory
 * @param {number} [maxReports]
 * @returns {string}
 */
export function formatCultivosForCenso(labHistory, maxReports) {
  var max = maxReports != null ? maxReports : CENSO_MAX_CULTIVO_REPORTS;
  var flat = extractCultivoTableRowsFromLabHistory(labHistory);
  var display = filterCultivoRowsSignificantFlip(flat);
  display.sort(function (a, b) {
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (db !== da) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
  if (!display.length) return '';

  var setById = Object.create(null);
  (labHistory || []).forEach(function (set) {
    if (set && set.id != null) setById[String(set.id)] = set;
  });

  var blocks = [];
  for (var i = 0; i < display.length && blocks.length < max; i++) {
    var r = display[i];
    var set = setById[String(r.labSetId)];
    if (!set) continue;
    var chunk = findCultivoChunkInSet(set, r.organismo);
    if (!chunk) continue;
    var text = formatCultivoCondensedForCopy(chunk, buildLabSetDateLine(set) || '');
    if (text.trim()) blocks.push(text.trim());
  }
  return blocks.join('\n\n');
}
