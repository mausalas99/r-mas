import {
  isInsulinIvMedicationItem,
  isInsulinPrandialMedicationItem,
  isInsulinRescateMedicationItem,
  normalizeNombreForSoapClassify
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";

// public/js/nm-antidiabetic-detect.mjs
var ANTIDIABETIC_MED_RE = /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|METFORMINA|REPAGLINIDA|GLIBENCLAMIDA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|SEMAGLUTIDA|LIRAGLUTIDA|DULAGLUTIDA|EXENATIDA|CANAGLIFLOZINA|LINAGLIPTINA|SAXAGLIPTINA|ALOGLIPTINA|GLICLAZIDA|NATEGLINIDA|ACARBOSE|MIGLITOL|ROSIGLITAZONA|HUMANA\s+RAPIDA)\b/i;
var RESCATE_NM_LINE_RE = /\bRESCATES\s+DE\s+INSULINA\b/i;
var INSULIN_NM_LINE_RE = /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|NPH|ASPARTA|LISPRO|GLULISINA|HUMANA\s+RAPIDA)\b/i;
var PRANDIAL_NM_LINE_RE = /^INSULINA\s+PREPRANDIAL:/i;
var BOMBA_NM_LINE_RE = /BOMBA\s+DE\s+INSULINA/i;
function isAntidiabeticMedNombre(nombreRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  return ANTIDIABETIC_MED_RE.test(n);
}
function isAntidiabeticNmLine(line) {
  var s = String(line || "").trim();
  if (!s) return false;
  if (RESCATE_NM_LINE_RE.test(s)) return true;
  if (PRANDIAL_NM_LINE_RE.test(s)) return true;
  if (BOMBA_NM_LINE_RE.test(s)) return true;
  if (INSULIN_NM_LINE_RE.test(s)) return true;
  return ANTIDIABETIC_MED_RE.test(normalizeNombreForSoapClassify(s));
}
function isAntidiabeticRecetaItem(item) {
  if (!item || typeof item !== "object") return false;
  var chip = (
    /** @type {{ _insulinPumpChip?: boolean, _insulinRescateChip?: boolean, _insulinPrandialChip?: boolean }} */
    item
  );
  if (chip._insulinPumpChip || chip._insulinRescateChip || chip._insulinPrandialChip) return true;
  if (isInsulinRescateMedicationItem(item)) return true;
  if (isInsulinPrandialMedicationItem(item)) return true;
  if (isInsulinIvMedicationItem(item)) return true;
  return isAntidiabeticMedNombre(
    /** @type {{ nombreRaw?: unknown }} */
    item.nombreRaw
  );
}
function partitionNmMedLines(lines) {
  var antidiabeticos = [];
  var other = [];
  var antidiabeticIndices = [];
  var otherIndices = [];
  var rescatesDisponibles = false;
  (Array.isArray(lines) ? lines : []).forEach(function(line, idx) {
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
    antidiabeticos,
    other,
    antidiabeticIndices,
    otherIndices,
    rescatesDisponibles
  };
}

export {
  RESCATE_NM_LINE_RE,
  INSULIN_NM_LINE_RE,
  isAntidiabeticRecetaItem,
  partitionNmMedLines
};
//# sourceMappingURL=/js/chunks/chunk-5CRK7XGO.js.map
