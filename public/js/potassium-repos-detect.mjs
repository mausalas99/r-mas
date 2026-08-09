/**
 * Detección de reposición de potasio IV en bloques SOME (MEDICAMENTOS P1 + diluyente).
 */
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';
import { trimStr } from './med-receta-util.mjs';

var KCL_RE = /\bCLORURO\s+DE\s+POTASIO\b/i;
var K_PHOS_RE = /\bFOSFATO\s+DE\s+POTASIO\b/i;
var K_ACETATE_RE = /\bACETATO\s+DE\s+POTASIO\b/i;
var NACL_RE = /\bCLORURO\s+DE\s+SODIO\b/i;

var HOUR_UNIT_RE = '(?:HORA|HORAS|HRS?|HR)';
var CC_ML_RE = '(?:CC|ML)';

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
function parseInfusionNum(raw) {
  if (raw == null || raw === '') return null;
  var n = Number(String(raw).replace(/,/g, '.').trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza texto de infusión SOME (espacios, cc/hr, VEL INF, etc.).
 * @param {unknown[]} parts
 * @returns {string}
 */
function normalizeInfusionCarrierBlob(parts) {
  var t = (parts || [])
    .map(function (x) {
      return trimStr(x);
    })
    .join(' ');
  t = t
    .replace(/VEL\.?\s*INF\.?/gi, ' VEL.INF ')
    .replace(/VEL\s+DE\s+INFUSI[ÓO]N/gi, ' VEL.INF ')
    .replace(/VELOCIDAD\s+DE\s+INFUSI[ÓO]N/gi, ' VEL.INF ')
    .replace(/(\d+(?:[.,]\d+)?)(CC|ML)\b/gi, '$1 $2')
    .replace(/(\d)(CC|ML)(?=\/)/gi, '$1 $2')
    .replace(/(CC|ML)\s*\/\s*/gi, '$1 / ')
    .replace(/(\d)(CC|ML)(?=\s*(?:\/|HR|HRS|H\b|HORA|HORAS|POR))/gi, '$1 $2')
    .replace(/\bHRS\b/gi, 'HORAS')
    .replace(/\bHR\b/gi, 'HORA')
    .replace(/\bPOR\s+HORA\b/gi, '/ HORA')
    .replace(/\bAL\s+HORA\b/gi, '/ HORA')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return t;
}

/**
 * @param {unknown[]} parts
 * @returns {string}
 */
function infusionCarrierBlob(parts) {
  return normalizeInfusionCarrierBlob(parts);
}

/**
 * @param {number} hours
 * @returns {string}
 */
function formatPotassiumReposHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return '';
  var rounded = Math.round(hours * 10) / 10;
  var label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, '');
  return 'PARA ' + label + ' HORAS';
}

/**
 * @param {string} blob
 * @returns {number | null}
 */
function extractInfusionVolumeMl(blob) {
  var sources = [blob.split(/VEL\.INF/i)[0], blob];
  for (var i = 0; i < sources.length; i++) {
    var m = sources[i].match(new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + CC_ML_RE + '\\b', 'i'));
    if (m) return parseInfusionNum(m[1]);
  }
  return null;
}

/**
 * @param {string} segment
 * @returns {number | null}
 */
function extractCcPerHourFromSegment(segment) {
  if (!segment) return null;
  var slashRate = segment.match(
    new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + CC_ML_RE + '\\s*/\\s*' + HOUR_UNIT_RE + '\\b', 'i')
  );
  if (slashRate) return parseInfusionNum(slashRate[1]);
  var plainRate = segment.match(
    new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + CC_ML_RE + '\\s+(?:POR\\s+)?' + HOUR_UNIT_RE + '\\b', 'i')
  );
  if (plainRate) return parseInfusionNum(plainRate[1]);
  return null;
}

/**
 * @param {string} blob
 * @returns {number | null}
 */
function extractVelInfCcPerHour(blob) {
  var segments = [];
  var vel = blob.match(/VEL\.INF\s*:\s*(.+)$/i);
  if (vel) segments.push(vel[1]);
  segments.push(blob);
  for (var i = 0; i < segments.length; i++) {
    var rate = extractCcPerHourFromSegment(segments[i]);
    if (rate != null) return rate;
  }
  return null;
}

/**
 * @param {string} blob
 * @returns {number | null}
 */
function extractExplicitDurationHours(blob) {
  var para = blob.match(
    new RegExp('(?:PARA|EN|A)\\s+(\\d+(?:[.,]\\d+)?)\\s*' + HOUR_UNIT_RE + '\\b', 'i')
  );
  if (para) return parseInfusionNum(para[1]);
  var vel = blob.match(/VEL\.INF\s*:\s*(.+)$/i);
  if (vel) {
    var directH = vel[1].match(new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*' + HOUR_UNIT_RE + '\\b', 'i'));
    if (directH) return parseInfusionNum(directH[1]);
  }
  return null;
}

/**
 * @param {string} blob
 * @returns {boolean}
 */
function blobLooksLikeInfusionCarrier(blob) {
  if (!blob) return false;
  if (/VEL\.INF/i.test(blob)) return true;
  if (new RegExp('(?:PARA|EN|A)\\s+\\d+(?:[.,]\\d+)?\\s*' + HOUR_UNIT_RE + '\\b', 'i').test(blob)) {
    return true;
  }
  if (new RegExp('\\d+(?:[.,]\\d+)?\\s*' + CC_ML_RE + '\\s*/\\s*' + HOUR_UNIT_RE + '\\b', 'i').test(blob)) {
    return true;
  }
  return new RegExp(
    '\\d+(?:[.,]\\d+)?\\s*' + CC_ML_RE + '\\s+(?:POR\\s+)?' + HOUR_UNIT_RE + '\\b',
    'i'
  ).test(blob);
}

/**
 * @param {string} blob
 * @returns {string}
 */
function potassiumReposDurationFromCarrierBlob(blob) {
  if (!blob) return '';
  var explicit = extractExplicitDurationHours(blob);
  if (explicit != null) return formatPotassiumReposHours(explicit);
  var volumeMl = extractInfusionVolumeMl(blob);
  var ccPerHour = extractVelInfCcPerHour(blob);
  if (volumeMl != null && ccPerHour != null && ccPerHour > 0) {
    return formatPotassiumReposHours(volumeMl / ccPerHour);
  }
  return '';
}

/**
 * @param {{ nombreRaw?: unknown, suspendido?: boolean } | null | undefined} item
 * @returns {boolean}
 */
export function isPotassiumReposMedicationItem(item) {
  if (!item || item.suspendido) return false;
  var n = normalizeNombreForSoapClassify(item.nombreRaw);
  return KCL_RE.test(n) || K_PHOS_RE.test(n) || K_ACETATE_RE.test(n);
}

/**
 * @param {unknown[]} items
 * @returns {unknown[]}
 */
export function potassiumReposItemsFromList(items) {
  return (Array.isArray(items) ? items : []).filter(isPotassiumReposMedicationItem);
}

/**
 * @param {unknown[]} items
 * @returns {boolean}
 */
export function patientHasPotassiumReposMeds(items) {
  return potassiumReposItemsFromList(items).length > 0;
}

/**
 * Diluyente P1 (p. ej. cloruro 0.9 % con VEL.INF) cuando el bloque incluye reposición de K.
 * @param {unknown} item
 * @param {unknown[]} allItems
 * @returns {boolean}
 */
export function isPotassiumReposCarrierMedicationItem(item, allItems) {
  if (!item || typeof item !== 'object' || /** @type {{ suspendido?: boolean }} */ (item).suspendido) {
    return false;
  }
  if (!patientHasPotassiumReposMeds(allItems)) return false;
  if (isPotassiumReposMedicationItem(item)) return false;
  var n = normalizeNombreForSoapClassify(/** @type {{ nombreRaw?: unknown }} */ (item).nombreRaw);
  if (!NACL_RE.test(n)) return false;
  var blob = infusionCarrierBlob([
    /** @type {{ dosisRaw?: unknown, frecuenciaRaw?: unknown }} */ (item).dosisRaw,
    /** @type {{ frecuenciaRaw?: unknown }} */ (item).frecuenciaRaw,
  ]);
  return blobLooksLikeInfusionCarrier(blob);
}

/**
 * Duración de infusión desde diluyente P1 (PARA X HORAS o volumen ÷ CC/HORA).
 * @param {unknown[]} items
 * @returns {string}
 */
export function potassiumReposDurationClause(items) {
  var list = Array.isArray(items) ? items : [];
  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    if (!isPotassiumReposCarrierMedicationItem(it, list)) continue;
    var blob = infusionCarrierBlob([
      /** @type {{ dosisRaw?: unknown, frecuenciaRaw?: unknown }} */ (it).dosisRaw,
      /** @type {{ frecuenciaRaw?: unknown }} */ (it).frecuenciaRaw,
    ]);
    var clause = potassiumReposDurationFromCarrierBlob(blob);
    if (clause) return clause;
  }
  return '';
}
