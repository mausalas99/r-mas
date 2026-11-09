/**
 * Cultivos para censo: una línea por sitio, solo el resultado más reciente
 * si es positivo. Sitio y agente abreviados; sin ATB ni cuenta.
 */
import {
  sortLabHistoryChronological,
} from './tend-core.mjs';
import {
  splitResLabsByTipo as splitResLabsByTipoCore,
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  cultivoSeriesKey,
} from './cultivo-block-core.mjs';

export { splitResLabsByTipo } from './cultivo-block-core.mjs';

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
  [/\bIZQUIERD[OA]\b/gi, 'IZQ'],
  [/\bDERECH[OA]\b/gi, 'DER'],
  [/\bHEMOCULTIVO\b/gi, 'HEMOC'],
  [/\bUROCULTIVO\b/gi, 'UROC'],
  [/\bFUNGICULTIVO\b/gi, 'FUNGIC'],
];

/** Abrevia palabras de sitio anatómico comunes; deja lo demás igual. */
function abbreviateSitioCultivo(sitio) {
  var s = String(sitio || '').trim();
  if (!s) return s;
  // "TEJIDO CUTANEO (TEJIDO DE HER TOBILLO IZQUIERDO)": lo útil es el paréntesis.
  var generic = s.match(/^(?:TEJIDO|PRODUCTOS?\s+DIVERSOS?|MUESTRA|OTROS?)\b[^(]*\(([^)]+)\)/i);
  if (generic) s = generic[1].replace(/^TEJIDO(\s+DE)?\s+/i, '');
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

/** Una línea: sitio fecha: agente. */
function buildCompactCultivoLine(r) {
  var sitio = abbreviateSitioCultivo(r.sitio);
  var fechaCorta = String(r.fechaMuestra || '').replace(/\/\d{4}$/, '');
  var fecha = fechaCorta && fechaCorta !== '—' ? ' ' + fechaCorta : '';
  return (sitio + fecha).trim() + ': ' + abbreviateOrganismoScientific(r.organismo);
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

function rowMs(r) {
  return r.sortKeyMs != null ? r.sortKeyMs : r.sortMs || 0;
}

/**
 * @param {unknown[]} labHistory
 * @returns {string}
 */
export function formatCultivosForCenso(labHistory) {
  var latest = Object.create(null);
  var order = [];
  extractCultivoTableRowsFromLabHistory(labHistory).forEach(function (r) {
    var k = cultivoSeriesKey(r);
    var cur = latest[k];
    if (!cur) order.push(k);
    if (!cur || rowMs(r) > rowMs(cur) || (rowMs(r) === rowMs(cur) && (r._seq || 0) > (cur._seq || 0))) {
      latest[k] = r;
    }
  });
  return order
    .map(function (k) {
      return latest[k];
    })
    .filter(function (r) {
      return !r.negativo;
    })
    .sort(function (a, b) {
      return rowMs(b) - rowMs(a) || (b._seq || 0) - (a._seq || 0);
    })
    .map(buildCompactCultivoLine)
    .join('\n');
}
