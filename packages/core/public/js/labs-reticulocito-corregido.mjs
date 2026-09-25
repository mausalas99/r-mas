// Reticulocito corregido: RetC = Ret% × (Hto paciente / 45).
// RetC ≥ 2% → anemia regenerativa (respuesta medular adecuada); < 2% → arregenerativa.
var HTO_NORMAL = 45;
var UMBRAL_REGENERATIVA = 2;

function parseLabNum_(str) {
  if (str === '---' || str == null || str === '') return null;
  var n = parseFloat(String(str).replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function computeRetiCorregidoValue_(retStr, htoStr) {
  var ret = parseLabNum_(retStr);
  var hto = parseLabNum_(htoStr);
  if (ret == null || hto == null) return null;
  return ret * (hto / HTO_NORMAL);
}

export function classifyRetiCorregido_(value) {
  if (value == null || !isFinite(value)) return null;
  return value >= UMBRAL_REGENERATIVA ? 'regenerativa' : 'arregenerativa';
}

export function computeRetiCorregido_(retStr, htoStr) {
  var value = computeRetiCorregidoValue_(retStr, htoStr);
  if (value == null) return '---';
  var rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  var valStr = rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
  return valStr + ' (' + classifyRetiCorregido_(value) + ')';
}
