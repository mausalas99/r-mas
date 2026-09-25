import { normalizeTodoPriority } from './todos-priority.mjs';

var CENSO_PENDIENTES_TIERS = ['alta', 'media', 'baja'];

/**
 * Pendientes abiertos para columna censo: hasta 3 del primer nivel con items
 * (alta → media → baja). Texto completo, sin truncar.
 * Con `all: true` (vista previa), devuelve todos los pendientes abiertos de
 * todos los niveles, sin recorte — el PDF sigue usando el tope de 3.
 * @param {Array<{ text?: string, completed?: boolean, priority?: string, createdAt?: string }>} todos
 * @param {{ maxCount?: number, all?: boolean }} [opts]
 * @returns {string[]}
 */
export function formatPendientesForCenso(todos, opts) {
  opts = opts || {};
  var maxCount = opts.maxCount == null ? 3 : opts.maxCount;
  var open = (todos || []).filter(function (t) {
    return t && !t.completed && String(t.text || '').trim();
  });
  if (!open.length) return [];

  if (opts.all) {
    var all = [];
    CENSO_PENDIENTES_TIERS.forEach(function (tier) {
      var matched = open.filter(function (t) {
        return normalizeTodoPriority(t.priority) === tier;
      });
      matched.sort(comparePendientesForCenso);
      all = all.concat(matched);
    });
    return all.map(function (t) {
      return String(t.text).trim();
    });
  }

  for (var i = 0; i < CENSO_PENDIENTES_TIERS.length; i++) {
    var tier = CENSO_PENDIENTES_TIERS[i];
    var matched2 = open.filter(function (t) {
      return normalizeTodoPriority(t.priority) === tier;
    });
    if (!matched2.length) continue;
    matched2.sort(comparePendientesForCenso);
    return matched2.slice(0, maxCount).map(function (t) {
      return String(t.text).trim();
    });
  }
  return [];
}

function comparePendientesForCenso(a, b) {
  if (a.createdAt && b.createdAt) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  }
  return 0;
}
