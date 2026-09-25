/**
 * Gasometría del expediente para cálculos ventilatorios en Estado Actual.
 */
import { sortLabHistoryChronological } from '../tend-core.mjs';
import { serieNumFromLabSet } from '../tend-group-gaso-slot.mjs';
import { resLabsHasGasometria } from '../lab-history-format.mjs';
import { buildLabSetDateLineForNota } from '../lab-history-format.mjs';

/** @typedef {'arterial' | 'venous' | 'capillary' | 'unknown' | null} GasometryKind */

/**
 * @returns {{ kind: GasometryKind, pO2: number | null, pCO2: number | null, pH: number | null, sourceLabel: string, setId: string | null }}
 */
export function emptyVentilatorioLabContext() {
  return { kind: null, pO2: null, pCO2: null, pH: null, sourceLabel: '', setId: null };
}

/**
 * @param {string | null | undefined} sourceText
 * @param {unknown[]} [resLabs]
 * @returns {GasometryKind}
 */
export function classifyGasometryKind(sourceText, resLabs) {
  var parts = [String(sourceText || '')];
  if (Array.isArray(resLabs)) {
    for (var i = 0; i < resLabs.length; i++) {
      parts.push(String(resLabs[i] || ''));
    }
  }
  var t = parts.join(' ').toUpperCase();
  if (!t.trim()) return 'unknown';
  if (/GASOMETRIA\s+VENOSA|VENOSA\s+PARCIAL|GASES\s+VENOS/i.test(t)) return 'venous';
  if (/GASOMETRIA\s+ARTERIAL|ARTERIAL\s+COMPLETA|GASES\s+ARTERIAL/i.test(t)) return 'arterial';
  if (/CAPILAR/i.test(t)) return 'capillary';
  return 'unknown';
}

/**
 * @param {unknown[]} [resLabs]
 * @returns {string}
 */
function findGasesResLabLine(resLabs) {
  if (!Array.isArray(resLabs)) return '';
  for (var i = 0; i < resLabs.length; i++) {
    var s = String(resLabs[i] || '').trim();
    if (/^GASES\b/i.test(s)) return s;
  }
  return '';
}

/**
 * @param {string} line
 * @param {string} fieldKey
 * @returns {number | null}
 */
function parseGasesFieldFromLine(line, fieldKey) {
  if (!line) return null;
  var key = fieldKey === 'pH' ? 'pH' : fieldKey;
  var re = new RegExp(
    '(?:^|\\s)' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(-?\\d+(?:\\.\\d+)?)\\*?',
    'i'
  );
  var m = line.match(re);
  if (!m) return null;
  var n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} set
 * @param {string} fieldKey
 * @returns {number | null}
 */
function gasesValueFromSet(set, fieldKey) {
  if (!set) return null;
  if (set.parsedBySection) {
    var parsed = serieNumFromLabSet(set, 'GASES', fieldKey);
    if (parsed != null) return parsed;
  }
  return parseGasesFieldFromLine(findGasesResLabLine(set.resLabs), fieldKey);
}

/**
 * @param {string} kind
 * @returns {string}
 */
export function gasometryKindLabel(kind) {
  if (kind === 'arterial') return 'arterial';
  if (kind === 'venous') return 'venosa';
  if (kind === 'capillary') return 'capilar';
  if (kind === 'unknown') return 'tipo no identificado';
  return '';
}

/**
 * @param {unknown} set
 * @returns {string}
 */
function formatLabSetSourceLabel(set) {
  if (!set) return '';
  var date = buildLabSetDateLineForNota(set);
  var kind = classifyGasometryKind(set.sourceText, set.resLabs);
  var kindLbl = gasometryKindLabel(kind);
  if (date && kindLbl) return 'Gasometría ' + kindLbl + ' · ' + date;
  if (date) return 'Gasometría · ' + date;
  if (kindLbl) return 'Gasometría ' + kindLbl;
  return 'Gasometría en expediente';
}

/**
 * @param {string | null | undefined} patientId
 * @param {Record<string, unknown[]> | null | undefined} labHistoryMap
 */
export function resolveVentilatorioLabContext(patientId, labHistoryMap) {
  if (!patientId || !labHistoryMap) return emptyVentilatorioLabContext();
  var sets = labHistoryMap[patientId];
  if (!Array.isArray(sets) || !sets.length) return emptyVentilatorioLabContext();

  var sorted = sortLabHistoryChronological(sets);
  for (var i = 0; i < sorted.length; i++) {
    var set = sorted[i];
    if (!set || !resLabsHasGasometria(set.resLabs)) continue;
    var kind = classifyGasometryKind(set.sourceText, set.resLabs);
    return {
      kind: kind,
      pO2: gasesValueFromSet(set, 'pO2'),
      pCO2: gasesValueFromSet(set, 'pCO2'),
      pH: gasesValueFromSet(set, 'pH'),
      sourceLabel: formatLabSetSourceLabel(set),
      setId: set.id != null ? String(set.id) : null,
    };
  }
  return emptyVentilatorioLabContext();
}

/**
 * @param {GasometryKind} kind
 * @returns {boolean}
 */
export function gasometryKindSupportsPafi(kind) {
  return kind === 'arterial' || kind === 'capillary';
}
