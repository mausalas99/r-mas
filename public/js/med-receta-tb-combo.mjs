import { trimStr } from './med-receta-util.mjs';
import { effectiveDiaTratamiento, stripDiaMarkersFromDosis } from './med-receta-dates.mjs';

function dosisBeforeSlash(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf('//');
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}

var RHZE_PARTS_RE =
  /\bRIFAMPICINA\b.*\bISONIAZIDA\b.*\bPIRAZINAMIDA\b.*\b(?:ETAMBUTOL|ETHAMBUTOL)\b/i;

var WEEKDAY_TOKEN_RE =
  /\b(?:LOS\s+)?(LUNES|MARTES|MIERCOLES|MIÉRCOLES|MIE|JUEVES|JUE|VIERNES|VIE|SABADO|SÁBADO|SAB|DOMINGO|DOM|LUN|MAR)\b/gi;

var WEEKDAY_ABBR = {
  LUNES: 'LUN',
  LUN: 'LUN',
  MARTES: 'MAR',
  MAR: 'MAR',
  MIERCOLES: 'MIE',
  MIÉRCOLES: 'MIE',
  MIE: 'MIE',
  JUEVES: 'JUE',
  JUE: 'JUE',
  VIERNES: 'VIE',
  VIE: 'VIE',
  SABADO: 'SAB',
  SÁBADO: 'SAB',
  SAB: 'SAB',
  DOMINGO: 'DOM',
  DOM: 'DOM',
};

/**
 * RHZE / DOTBAL: RIFAMPICINA + ISONIAZIDA + PIRAZINAMIDA + ETAMBUTOL (FDC tableta).
 * @param {{ nombreRaw?: string }} item
 */
export function isRhzeComboMedicationItem(item) {
  if (!item) return false;
  var n = String(item.nombreRaw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return RHZE_PARTS_RE.test(n);
}

/**
 * Días de la semana en comentario de dosis (p. ej. // DAR LOS LUNES - MIE - VIE).
 * @param {string} dosisRaw
 * @returns {string|null} p. ej. "LUN-MIE-VIE"
 */
export function extractWeekdayScheduleLabel(dosisRaw) {
  var raw = String(dosisRaw || '');
  var comment = '';
  var slashIdx = raw.indexOf('//');
  if (slashIdx >= 0) comment = raw.slice(slashIdx + 2);
  else comment = raw;
  comment = comment.replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, ' ');
  var seen = Object.create(null);
  var out = [];
  var m;
  WEEKDAY_TOKEN_RE.lastIndex = 0;
  while ((m = WEEKDAY_TOKEN_RE.exec(comment)) !== null) {
    var token = String(m[1] || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    var abbr = WEEKDAY_ABBR[token];
    if (!abbr || seen[abbr]) continue;
    seen[abbr] = 1;
    out.push(abbr);
  }
  return out.length ? out.join('-') : null;
}

function extractRhzeTabletCount(dosisRaw) {
  var left = dosisBeforeSlash(dosisRaw);
  var m = String(left || '').match(/(\d+)\s*TABLETAS?\b/i);
  if (!m) return '';
  var n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return '';
  return String(n) + ' TABLETAS';
}

/**
 * Indicación compacta DOTBAL para Estado Actual / SOAP.
 * @param {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null }} item
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function formatRhzeComboSoapShort(item, opts) {
  var parts = ['DOTBAL'];
  var tablets = extractRhzeTabletCount(item.dosisRaw);
  if (tablets) parts.push(tablets);

  var weekday = extractWeekdayScheduleLabel(item.dosisRaw);
  if (weekday) parts.push(weekday);
  else parts.push('C/24H');

  var dia =
    item.diaTratamiento != null
      ? effectiveDiaTratamiento(item.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate)
      : null;
  if (dia != null) parts.push('DIA ' + dia);
  return trimStr(parts.join(' '));
}
