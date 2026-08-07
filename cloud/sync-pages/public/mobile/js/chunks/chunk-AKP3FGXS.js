// public/js/features/estado-actual-ranges.mjs
var RANGES = {
  tas: { min: 90, max: 140 },
  tad: { min: 60, max: 90 },
  fc: { min: 60, max: 100 },
  fr: { min: 12, max: 20 },
  temp: { min: 36, max: 37.5 },
  sat: { min: 94, max: Infinity }
};
var GLU_RANGE = { min: 70, max: 180 };
var TEMP_FEVER_PICO_MIN = 38;
function isTempFeverPeak(raw) {
  if (raw == null || String(raw).trim() === "") return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  return n >= TEMP_FEVER_PICO_MIN;
}
function isGluAltered(raw) {
  if (raw == null || String(raw).trim() === "") return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  return n < GLU_RANGE.min || n > GLU_RANGE.max;
}
function isGlucometriaMarkedAltered(glu) {
  if (!glu || typeof glu !== "object") return false;
  if (
    /** @type {{ altered?: unknown }} */
    glu.altered === true
  ) return true;
  return isGluAltered(
    /** @type {{ value?: unknown }} */
    glu.value
  );
}
function isVitalAltered(key, raw) {
  if (raw == null || String(raw).trim() === "") return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  const r = RANGES[key];
  if (!r) return false;
  return n < r.min || n > r.max;
}
function isTempFebrile(raw) {
  if (raw == null || String(raw).trim() === "") return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  return n > RANGES.temp.max;
}
function isBpHypotensive(tas, tad) {
  if (tas != null && String(tas).trim() !== "") {
    const n = Number(tas);
    if (Number.isFinite(n) && n < RANGES.tas.min) return true;
  }
  if (tad != null && String(tad).trim() !== "") {
    const n = Number(tad);
    if (Number.isFinite(n) && n < RANGES.tad.min) return true;
  }
  return false;
}
function isHemodynamicallyUnstable(vitals, vasopField) {
  const v = vitals && typeof vitals === "object" ? vitals : {};
  if (isBpHypotensive(v.tas, v.tad)) return true;
  if (isVitalAltered("fc", v.fc)) return true;
  if (vasopField != null && String(vasopField).trim() !== "") return true;
  return false;
}

export {
  isTempFeverPeak,
  isGlucometriaMarkedAltered,
  isVitalAltered,
  isTempFebrile,
  isHemodynamicallyUnstable
};
//# sourceMappingURL=/js/chunks/chunk-AKP3FGXS.js.map
