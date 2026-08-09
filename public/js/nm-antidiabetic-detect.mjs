/**
 * Antidiabéticos dentro de NM (insulinas, rescates, preprandial, bomba, orales).
 */
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';
import { isInsulinRescateMedicationItem } from './insulin-rescate-detect.mjs';
import { isInsulinPrandialMedicationItem } from './insulin-prandial-detect.mjs';
import { isInsulinIvMedicationItem } from './insulin-pump-some-detect.mjs';

export const ANTIDIABETIC_MED_RE =
  /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|METFORMINA|REPAGLINIDA|GLIBENCLAMIDA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|SEMAGLUTIDA|LIRAGLUTIDA|DULAGLUTIDA|EXENATIDA|CANAGLIFLOZINA|LINAGLIPTINA|SAXAGLIPTINA|ALOGLIPTINA|GLICLAZIDA|NATEGLINIDA|ACARBOSE|MIGLITOL|ROSIGLITAZONA|HUMANA\s+RAPIDA)\b/i;

export const RESCATE_NM_LINE_RE = /\bRESCATES\s+DE\s+INSULINA\b/i;
export const INSULIN_NM_LINE_RE =
  /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|NPH|ASPARTA|LISPRO|GLULISINA|HUMANA\s+RAPIDA)\b/i;
export const PRANDIAL_NM_LINE_RE = /^INSULINA\s+PREPRANDIAL:/i;
export const BOMBA_NM_LINE_RE = /BOMBA\s+DE\s+INSULINA/i;

/**
 * @param {unknown} nombreRaw
 * @returns {boolean}
 */
export function isAntidiabeticMedNombre(nombreRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  return ANTIDIABETIC_MED_RE.test(n);
}

/**
 * @param {unknown} line
 * @returns {boolean}
 */
export function isAntidiabeticNmLine(line) {
  var s = String(line || '').trim();
  if (!s) return false;
  if (RESCATE_NM_LINE_RE.test(s)) return true;
  if (PRANDIAL_NM_LINE_RE.test(s)) return true;
  if (BOMBA_NM_LINE_RE.test(s)) return true;
  if (INSULIN_NM_LINE_RE.test(s)) return true;
  return ANTIDIABETIC_MED_RE.test(normalizeNombreForSoapClassify(s));
}

/**
 * @param {unknown} item
 * @returns {boolean}
 */
export function isAntidiabeticRecetaItem(item) {
  if (!item || typeof item !== 'object') return false;
  var chip = /** @type {{ _insulinPumpChip?: boolean, _insulinRescateChip?: boolean, _insulinPrandialChip?: boolean }} */ (
    item
  );
  if (chip._insulinPumpChip || chip._insulinRescateChip || chip._insulinPrandialChip) return true;
  if (isInsulinRescateMedicationItem(item)) return true;
  if (isInsulinPrandialMedicationItem(item)) return true;
  if (isInsulinIvMedicationItem(item)) return true;
  return isAntidiabeticMedNombre(/** @type {{ nombreRaw?: unknown }} */ (item).nombreRaw);
}

/**
 * @param {string[]} lines
 * @returns {{
 *   antidiabeticos: string[],
 *   other: string[],
 *   antidiabeticIndices: number[],
 *   otherIndices: number[],
 *   rescatesDisponibles: boolean,
 * }}
 */
export function partitionNmMedLines(lines) {
  /** @type {string[]} */
  var antidiabeticos = [];
  /** @type {string[]} */
  var other = [];
  /** @type {number[]} */
  var antidiabeticIndices = [];
  /** @type {number[]} */
  var otherIndices = [];
  var rescatesDisponibles = false;
  (Array.isArray(lines) ? lines : []).forEach(function (line, idx) {
    if (RESCATE_NM_LINE_RE.test(line)) {
      rescatesDisponibles = true;
      antidiabeticos.push(line);
      antidiabeticIndices.push(idx);
      return;
    }
    if (isAntidiabeticNmLine(line)) {
      antidiabeticos.push(line);
      antidiabeticIndices.push(idx);
    } else {
      other.push(line);
      otherIndices.push(idx);
    }
  });
  return {
    antidiabeticos: antidiabeticos,
    other: other,
    antidiabeticIndices: antidiabeticIndices,
    otherIndices: otherIndices,
    rescatesDisponibles: rescatesDisponibles,
  };
}
