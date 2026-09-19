/**
 * Cultivos para censo: versión condensada de una línea por cultivo,
 * con sitio y organismo abreviados para ocupar menos espacio.
 */
import {
  sortLabHistoryChronological,
} from './tend-core.mjs';
import {
  splitResLabsByTipo as splitResLabsByTipoCore,
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  findCultivoChunkInSet,
} from './cultivo-block-core.mjs';

export { splitResLabsByTipo } from './cultivo-block-core.mjs';

var CENSO_MAX_CULTIVO_REPORTS = 3;

var SITIO_ABBREV_MAP = [
  [/\bLIQUIDO\s+CEFALORRAQUIDEO\b/gi, 'LCR'],
  [/\bLIQUIDO\b/gi, 'LIQ'],
  [/\bPERITONEAL\b/gi, 'PERIT'],
  [/\bPLEURAL\b/gi, 'PLEUR'],
  [/\bSECRECION\b/gi, 'SECR'],
  [/\bBRONQUIAL\b/gi, 'BRONQ'],
  [/\bASPIRADO\b/gi, 'ASP'],
  [/\bTRAQUEAL\b/gi, 'TRAQ'],
  [/\bCATETER\b/gi, 'CAT'],
  [/\bHERIDA\b/gi, 'HER'],
  [/\bABSCESO\b/gi, 'ABSC'],
  [/\bDRENAJE\b/gi, 'DREN'],
  [/\bQUIRURGIC[AO]\b/gi, 'QX'],
  [/\bSUPERFICIAL\b/gi, 'SUPERF'],
  [/\bPROFUND[AO]\b/gi, 'PROF'],
  [/\bVASCULAR\b/gi, 'VASC'],
  [/\bPERIFERIC[AO]\b/gi, 'PERIF'],
  [/\bABDOMINAL\b/gi, 'ABD'],
  [/\bGASTRICO\b/gi, 'GAST'],
  [/\bHEMOCULTIVO\b/gi, 'HEMOC'],
  [/\bUROCULTIVO\b/gi, 'UROC'],
  [/\bFUNGICULTIVO\b/gi, 'FUNGIC'],
];

/** Abrevia palabras de sitio anatómico comunes; deja lo demás igual. */
function abbreviateSitioCultivo(sitio) {
  var s = String(sitio || '').trim();
  if (!s) return s;
  SITIO_ABBREV_MAP.forEach(function (pair) {
    s = s.replace(pair[0], pair[1]);
  });
  return s.replace(/\s+/g, ' ').trim();
}

var ORGANISM_NON_ABBREV_FIRST_WORDS = /^(NEGATIVO|FLORA|NO|SIN|POLIMICROBIANO|LEVADURAS?|HONGOS?|BACILOS?|COCOS?)$/i;

/** Convierte «GENERO especie» a «G. especie», convención científica estándar. */
function abbreviateOrganismoScientific(organismo) {
  var s = String(organismo || '').trim();
  if (!s || s === '—') return s;
  var words = s.split(/\s+/);
  if (words.length < 2) return s;
  var genus = words[0];
  var species = words[1];
  if (!/^[A-ZÁÉÍÓÚÑ]{4,}$/i.test(genus)) return s;
  if (!/^[A-ZÁÉÍÓÚÑ]+$/i.test(species)) return s;
  if (ORGANISM_NON_ABBREV_FIRST_WORDS.test(genus)) return s;
  var rest = words.slice(2).join(' ');
  return (genus.charAt(0).toUpperCase() + '. ' + species.toLowerCase() + (rest ? ' ' + rest : '')).trim();
}

function extractAtbLineFromChunk(chunk) {
  var lines = String(chunk || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].replace(/\*+$/g, '').trim();
    if (/^ATB\b/i.test(l)) return l;
  }
  return '';
}

/** Une sitio+fecha+organismo+ATB+Cuenta en una sola línea condensada. */
function buildCompactCultivoLine(r, atbLine) {
  var sitio = abbreviateSitioCultivo(r.sitio);
  var fechaCorta = String(r.fechaMuestra || '').replace(/\/\d{4}$/, '');
  var fecha = fechaCorta && fechaCorta !== '—' ? ' ' + fechaCorta : '';
  var organismo = abbreviateOrganismoScientific(r.organismo);
  var head = (sitio + fecha).trim() + ': ' + organismo;
  var parts = [head];
  if (atbLine) parts.push(atbLine);
  if (r.cuenta) parts.push('Cuenta: ' + r.cuenta);
  return parts.join(' · ');
}

function extractCultivoTableRowsFromLabHistory(history) {
  var rows = [];
  var seq = 0;
  sortLabHistoryChronological(history || []).forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = splitResLabsByTipoCore(set.resLabs).cultivo;
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

/** Mismo criterio que la tabla de cultivos. */
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
    var line = buildCompactCultivoLine(r, extractAtbLineFromChunk(chunk));
    if (line.trim()) blocks.push(line.trim());
  }
  return blocks.join('\n');
}
