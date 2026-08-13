/**
 * Partición de campos de medicamentos para plantilla SOAP de Estado Actual.
 */
import {
  INSULIN_NM_LINE_RE,
  RESCATE_NM_LINE_RE,
  partitionNmMedLines,
} from '../nm-antidiabetic-detect.mjs';

/**
 * @param {unknown} fieldVal
 * @returns {string[]}
 */
function parseMedPipeItems(fieldVal) {
  if (fieldVal == null || !String(fieldVal).trim()) return [];
  return String(fieldVal)
    .split(' | ')
    .map(function (s) {
      return String(s).trim();
    })
    .filter(Boolean);
}

/**
 * @param {string[]} items
 * @returns {string}
 */
function joinMedPipeItems(items) {
  return (items || [])
    .map(function (s) {
      return String(s).trim();
    })
    .filter(Boolean)
    .join(' | ');
}

var ANTIEMETIC_LINE_RE =
  /\b(ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA)\b/i;

var ANTIPYRETIC_LINE_RE = /\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA)\b/i;

/**
 * @param {unknown} fieldVal
 * @returns {{ analgesia: string, antipireticos: string, antiemeticos: string }}
 */
export function partitionAnalgesiaForSoap(fieldVal) {
  /** @type {string[]} */
  var analgesia = [];
  /** @type {string[]} */
  var antipireticos = [];
  /** @type {string[]} */
  var antiemeticos = [];
  parseMedPipeItems(fieldVal).forEach(function (line) {
    if (ANTIEMETIC_LINE_RE.test(line)) antiemeticos.push(line);
    else if (ANTIPYRETIC_LINE_RE.test(line)) antipireticos.push(line);
    else analgesia.push(line);
  });
  return {
    analgesia: joinMedPipeItems(analgesia),
    antipireticos: joinMedPipeItems(antipireticos),
    antiemeticos: joinMedPipeItems(antiemeticos),
  };
}

/**
 * @param {unknown} fieldVal
 * @returns {{ other: string, insulin: string, antidiabeticos: string, rescatesDisponibles: boolean }}
 */
export function partitionNmMedsForSoap(fieldVal) {
  var part = partitionNmMedLines(parseMedPipeItems(fieldVal));
  /** @type {string[]} */
  var insulin = [];
  part.antidiabeticos.forEach(function (line) {
    if (
      INSULIN_NM_LINE_RE.test(line) &&
      !RESCATE_NM_LINE_RE.test(line) &&
      !/^INSULINA\s+PREPRANDIAL:/i.test(line) &&
      !/BOMBA\s+DE\s+INSULINA/i.test(line)
    ) {
      insulin.push(line);
    }
  });
  return {
    antidiabeticos: joinMedPipeItems(part.antidiabeticos),
    other: joinMedPipeItems(part.other),
    insulin: joinMedPipeItems(insulin),
    rescatesDisponibles: part.rescatesDisponibles,
  };
}
