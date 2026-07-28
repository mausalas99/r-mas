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

/** Sin tope de ventana (outlier labwork: une bloques >2 h respetando regla gaso+gaso). */
export const LAB_CONSOLIDATION_UNBOUNDED_WINDOW_MS = Number.MAX_SAFE_INTEGER;

/**
 * Familia de consolidación: labs y gasometrías iniciales comparten bucket;
 * cultivos y mixtos van aparte.
 * @param {string} [tipo]
 */
export function labConsolidationFamily(tipo) {
  if (tipo === 'mixed') return 'mixed';
  if (tipo === 'cultivo') return 'cultivo';
  return 'labwork';
}

/**
 * @param {string} [tipo]
 * @param {number} [windowMs]
 */
export function resolveLabConsolidationWindowMs(tipo, windowMs) {
  void tipo;
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

function chainTimedEntries(entries, windowMs) {
  var clusters = [];
  var cur = [];
  var prevMs = null;
  (entries || []).forEach(function (entry) {
    if (!cur.length || (prevMs != null && entry.ms - prevMs <= windowMs)) {
      cur.push(entry);
    } else {
      clusters.push(cur);
      cur = [entry];
    }
    prevMs = entry.ms;
  });
  if (cur.length) clusters.push(cur);
  return clusters;
}

function minAbsDistToCluster(ms, clusterEntries) {
  var dist = Infinity;
  (clusterEntries || []).forEach(function (e) {
    var d = Math.abs(ms - e.ms);
    if (d < dist) dist = d;
  });
  return dist;
}

function assignGasosToClosestLabClusters(labClusters, gasoEntries, windowMs) {
  var assigned = labClusters.map(function () {
    return null;
  });
  var candidates = [];
  gasoEntries.forEach(function (g, gi) {
    labClusters.forEach(function (cluster, ci) {
      var dist = minAbsDistToCluster(g.ms, cluster);
      if (dist <= windowMs) candidates.push({ gi: gi, ci: ci, dist: dist, ms: g.ms });
    });
  });
  candidates.sort(function (a, b) {
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.ms - b.ms;
  });
  var gasoUsed = Object.create(null);
  var clusterUsed = Object.create(null);
  candidates.forEach(function (c) {
    if (gasoUsed[c.gi] || clusterUsed[c.ci]) return;
    gasoUsed[c.gi] = true;
    clusterUsed[c.ci] = true;
    assigned[c.ci] = gasoEntries[c.gi];
  });
  return { assigned: assigned, gasoUsed: gasoUsed };
}

function clustersFromLabGasoAssignment(labClusters, assignedGasos) {
  return labClusters.map(function (cluster, ci) {
    var entries = cluster.slice();
    if (assignedGasos[ci]) entries.push(assignedGasos[ci]);
    entries.sort(function (a, b) {
      return a.ms - b.ms;
    });
    return entries.map(function (e) {
      return e.item;
    });
  });
}

function appendUntimedLabworkClusters(out, untimed, hasGasoFn) {
  var labs = [];
  var gasos = [];
  (untimed || []).forEach(function (item) {
    if (hasGasoFn(item)) gasos.push(item);
    else labs.push(item);
  });
  if (labs.length) out.push(labs);
  gasos.forEach(function (g) {
    out.push([g]);
  });
}

/**
 * Labs + una gasometría: ventana 2 h; empareja la gaso más cercana;
 * nunca dos gasometrías en el mismo cluster (también si el set ya trae GASES).
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number|null} getMs
 * @param {(item: T) => boolean} hasGaso — ítem ocupa el cupo de gasometría del cluster
 * @param {number} [windowMs]
 * @returns {T[][]}
 */
export function clusterLabworkByTimeWindow(items, getMs, hasGaso, windowMs) {
  var list = items || [];
  if (!list.length) return [];
  var w = typeof windowMs === 'number' && isFinite(windowMs) ? windowMs : LAB_CONSOLIDATION_WINDOW_MS;
  var gasoFn =
    typeof hasGaso === 'function'
      ? hasGaso
      : function () {
          return false;
        };

  var timed = [];
  var untimed = [];
  list.forEach(function (item) {
    var ms = getMs(item);
    if (ms == null) untimed.push(item);
    else timed.push({ item: item, ms: ms, isGaso: !!gasoFn(item) });
  });

  timed.sort(function (a, b) {
    return a.ms - b.ms;
  });

  var labsEntries = timed.filter(function (e) {
    return !e.isGaso;
  });
  var gasoEntries = timed.filter(function (e) {
    return e.isGaso;
  });
  var labClusters = chainTimedEntries(labsEntries, w);
  var pairing = assignGasosToClosestLabClusters(labClusters, gasoEntries, w);
  var out = clustersFromLabGasoAssignment(labClusters, pairing.assigned);

  gasoEntries.forEach(function (g, gi) {
    if (!pairing.gasoUsed[gi]) out.push([g.item]);
  });

  out.sort(function (a, b) {
    var ma = getMs(a[0]);
    var mb = getMs(b[0]);
    return (ma == null ? 0 : ma) - (mb == null ? 0 : mb);
  });

  appendUntimedLabworkClusters(out, untimed, gasoFn);
  return out;
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number|null} getMs
 * @param {(item: T) => string} getTipo
 * @param {(item: T) => boolean} hasGaso
 * @param {number} [windowMs]
 */
export function clusterLabConsolidationGroup(items, getMs, getTipo, hasGaso, windowMs) {
  var tipo = getTipo((items || [])[0]);
  if (labConsolidationFamily(tipo) === 'labwork') {
    return clusterLabworkByTimeWindow(items, getMs, hasGaso, windowMs);
  }
  return clusterByTimeWindow(items, getMs, resolveLabConsolidationWindowMs(tipo, windowMs));
}

/**
 * Agrupa ítems por día+familia y luego por ventana de consolidación.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} getDayKey
 * @param {(item: T) => string} getTipo — 'mixed' queda fuera de consolidación
 * @param {(item: T) => number|null} getMs
 * @param {(item: T) => boolean} [hasGaso]
 * @param {number} [windowMs]
 * @returns {T[][]}
 */
export function clusterByDayTipoAndTimeWindow(items, getDayKey, getTipo, getMs, hasGaso, windowMs) {
  var groups = Object.create(null);
  var mixedSingles = [];
  var gasoFn =
    typeof hasGaso === 'function'
      ? hasGaso
      : function (item) {
          return getTipo(item) === 'gaso';
        };

  (items || []).forEach(function (item) {
    var tipo = getTipo(item);
    if (tipo === 'mixed') {
      mixedSingles.push([item]);
      return;
    }
    var dk = getDayKey(item);
    if (!dk || dk === 'unknown' || dk === 'Anterior') return;
    var gk = dk + '\x01' + labConsolidationFamily(tipo);
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(item);
  });

  var out = mixedSingles.slice();
  Object.keys(groups).forEach(function (gk) {
    var family = String(gk.split('\x01')[1] || 'labwork');
    var groupItems = groups[gk];
    var clusterFn =
      family === 'labwork'
        ? function () {
            return clusterLabworkByTimeWindow(groupItems, getMs, gasoFn, windowMs);
          }
        : function () {
            var tipo = getTipo(groupItems[0]);
            return clusterByTimeWindow(groupItems, getMs, resolveLabConsolidationWindowMs(tipo, windowMs));
          };
    clusterFn().forEach(function (cluster) {
      out.push(cluster);
    });
  });
  return out;
}
