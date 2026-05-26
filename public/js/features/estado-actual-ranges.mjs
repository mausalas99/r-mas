export const RANGES = {
  tas: { min: 90, max: 140 },
  tad: { min: 60, max: 90 },
  fc: { min: 60, max: 100 },
  fr: { min: 12, max: 20 },
  temp: { min: 36.0, max: 37.5 },
  sat: { min: 94, max: Infinity },
};

export function isVitalAltered(key, raw) {
  if (raw == null || String(raw).trim() === '') return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  const r = RANGES[key];
  if (!r) return false;
  return n < r.min || n > r.max;
}

export function buildAlteredAtDefaults(vitals, defaultTime) {
  const out = {};
  Object.keys(RANGES).forEach((k) => {
    if (isVitalAltered(k, vitals[k])) out[k] = defaultTime;
  });
  return out;
}
