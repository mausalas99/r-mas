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

export {
  isTempFeverPeak,
  isGlucometriaMarkedAltered,
  isVitalAltered,
  isTempFebrile
};
//# sourceMappingURL=/js/chunks/chunk-7TIZPCQQ.js.map
