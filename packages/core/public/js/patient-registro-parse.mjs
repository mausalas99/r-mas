/**
 * Parsea varios expedientes desde texto pegado (líneas, comas, espacios).
 */

/** @param {string} raw */
export function parseRegistrosFromBulkInput(raw) {
  var parts = String(raw || '')
    .split(/[\s,;]+|\n+/)
    .map(function (s) {
      return String(s || '').trim();
    })
    .filter(Boolean);
  var seen = Object.create(null);
  var out = [];
  parts.forEach(function (reg) {
    var key = reg.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(reg);
  });
  return out;
}
