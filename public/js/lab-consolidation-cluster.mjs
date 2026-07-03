/**
 * Agrupa reportes/conjuntos de laboratorio para consolidación por ventana horaria.
 */
import {
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  parseFechaLabToMs,
} from './tend-core.mjs';

/** Ventana máxima entre tomas consecutivas para fusionar (2 h). */
export const LAB_CONSOLIDATION_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Gasometrías: no fusionar por ventana — cada toma es un conjunto. */
export const LAB_GASO_CONSOLIDATION_WINDOW_MS = 0;

/**
 * @param {string} [tipo]
 * @param {number} [windowMs]
 */
export function resolveLabConsolidationWindowMs(tipo, windowMs) {
  if (tipo === 'gaso') return LAB_GASO_CONSOLIDATION_WINDOW_MS;
  return typeof windowMs === 'number' && isFinite(windowMs) ? windowMs : LAB_CONSOLIDATION_WINDOW_MS;
}

export function labTimestampMsFromFechaHora(fecha, hora) {
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || '').trim();
  if (!fechaNorm || fechaNorm === 'Anterior') return null;
  var ms = parseFechaLabToMs(fechaNorm, normalizeHoraLabHistory(hora));
  return typeof ms === 'number' && isFinite(ms) ? ms : null;
}

/**
 * Cadena por hora: cada ítem se une al cluster anterior si la brecha ≤ windowMs.
 * Sin hora válida: un solo cluster si todos carecen de hora; si no, entradas sueltas.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number|null} getMs
 * @param {number} [windowMs]
 * @returns {T[][]}
 */
export function clusterByTimeWindow(items, getMs, windowMs) {
  var list = items || [];
  if (!list.length) return [];
  var w = typeof windowMs === 'number' && isFinite(windowMs) ? windowMs : LAB_CONSOLIDATION_WINDOW_MS;

  var timed = [];
  var untimed = [];
  list.forEach(function (item) {
    var ms = getMs(item);
    if (ms == null) untimed.push(item);
    else timed.push({ item: item, ms: ms });
  });

  timed.sort(function (a, b) {
    return a.ms - b.ms;
  });

  var clusters = [];
  var cur = [];
  var prevMs = null;
  timed.forEach(function (entry) {
    if (!cur.length || (prevMs != null && entry.ms - prevMs <= w)) {
      cur.push(entry.item);
    } else {
      clusters.push(cur);
      cur = [entry.item];
    }
    prevMs = entry.ms;
  });
  if (cur.length) clusters.push(cur);

  if (untimed.length === 1) {
    clusters.push(untimed);
  } else if (untimed.length > 1) {
    clusters.push(untimed.slice());
  }

  return clusters;
}

/**
 * Agrupa ítems por día+tipo homogéneo y luego por ventana de 2 h.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} getDayKey
 * @param {(item: T) => string} getTipo — 'mixed' queda fuera de consolidación
 * @param {(item: T) => number|null} getMs
 * @param {number} [windowMs]
 * @returns {T[][]}
 */
export function clusterByDayTipoAndTimeWindow(items, getDayKey, getTipo, getMs, windowMs) {
  var groups = Object.create(null);
  var mixedSingles = [];

  (items || []).forEach(function (item) {
    var tipo = getTipo(item);
    if (tipo === 'mixed') {
      mixedSingles.push([item]);
      return;
    }
    var dk = getDayKey(item);
    if (!dk || dk === 'unknown' || dk === 'Anterior') return;
    var gk = dk + '\x01' + tipo;
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(item);
  });

  var out = mixedSingles.slice();
  Object.keys(groups).forEach(function (gk) {
    var tipo = String(gk.split('\x01')[1] || 'labs');
    var w = resolveLabConsolidationWindowMs(tipo, windowMs);
    clusterByTimeWindow(groups[gk], getMs, w).forEach(function (cluster) {
      out.push(cluster);
    });
  });
  return out;
}
