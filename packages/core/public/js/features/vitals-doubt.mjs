/**
 * Valores de signos vitales físicamente imposibles (probable error de tecleo).
 * Límites conservadores: NO son rangos clínicos.
 */
var LIMITS = {
  fc: [20, 250],
  fr: [4, 70],
  tas: [40, 280],
  tad: [20, 180],
  temp: [30, 43],
  sat: [50, 100],
};

/**
 * @param {string} key clave del signo (fc, fr, tas, tad, temp, sat)
 * @param {number|string} value
 * @returns {boolean}
 */
export function isDoubtfulVital(key, value) {
  var lim = LIMITS[key];
  var n = Number(value);
  if (!lim || value === '' || value == null || !Number.isFinite(n)) return false;
  return n < lim[0] || n > lim[1];
}
