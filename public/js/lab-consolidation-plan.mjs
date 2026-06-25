/**
 * Plan de consolidación manual/automática del historial de laboratorio.
 */
import {
  clusterByTimeWindow,
  labTimestampMsFromFechaHora,
  LAB_CONSOLIDATION_WINDOW_MS,
} from './lab-consolidation-cluster.mjs';

export function labDayTipoGroupKey(dayKey, tipo) {
  return String(dayKey || '') + '\x01' + String(tipo || 'labs');
}

export function splitLabDayTipoGroupKey(gk) {
  var parts = String(gk || '').split('\x01');
  return { dayKey: parts[0] || '', tipo: parts[1] || 'labs' };
}

function groupSetsByDayTipo(sets, getDayKey, getTipo) {
  var groups = Object.create(null);
  (sets || []).forEach(function (set) {
    var tipo = getTipo(set);
    if (tipo === 'mixed') return;
    var dk = getDayKey(set);
    if (!dk || dk === 'unknown' || dk === 'Anterior') return;
    var gk = labDayTipoGroupKey(dk, tipo);
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(set);
  });
  return groups;
}

/**
 * Grupos mismo día+tipo con ≥2 clusters horarios (>2 h entre bloques).
 */
export function findOutlierLabConsolidationGroups(sets, getDayKey, getTipo, getMs, windowMs) {
  var groups = groupSetsByDayTipo(sets, getDayKey, getTipo);
  var outliers = [];
  Object.keys(groups).forEach(function (gk) {
    var arr = groups[gk];
    if (arr.length < 2) return;
    var clusters = clusterByTimeWindow(arr, getMs, windowMs);
    if (clusters.length < 2) return;
    var split = splitLabDayTipoGroupKey(gk);
    outliers.push({
      groupKey: gk,
      dayKey: split.dayKey,
      tipo: split.tipo,
      clusters: clusters,
      setCount: arr.length,
    });
  });
  return outliers;
}

/**
 * @param {Set<string>|string[]|null} outlierGroupKeys — fusionar día completo ignorando ventana
 * @returns {Array<{ groupKey: string, kind: 'auto'|'outlier', sets: unknown[] }>}
 */
export function buildLabConsolidationMergeJobs(
  sets,
  getDayKey,
  getTipo,
  getMs,
  outlierGroupKeys,
  windowMs
) {
  var outlierSet =
    outlierGroupKeys instanceof Set
      ? outlierGroupKeys
      : outlierGroupKeys
        ? new Set(outlierGroupKeys)
        : new Set();
  var groups = groupSetsByDayTipo(sets, getDayKey, getTipo);
  var jobs = [];
  Object.keys(groups).forEach(function (gk) {
    var arr = groups[gk];
    if (arr.length < 2) return;
    if (outlierSet.has(gk)) {
      jobs.push({ groupKey: gk, kind: 'outlier', sets: arr.slice() });
      return;
    }
    clusterByTimeWindow(arr, getMs, windowMs).forEach(function (cluster) {
      if (cluster.length >= 2) {
        jobs.push({ groupKey: gk, kind: 'auto', sets: cluster.slice() });
      }
    });
  });
  return jobs;
}

export function countAutoLabConsolidationMerges(jobs) {
  return (jobs || []).reduce(function (acc, job) {
    if (job.kind !== 'auto') return acc;
    return acc + job.sets.length - 1;
  }, 0);
}

export function countOutlierLabConsolidationMerges(jobs) {
  return (jobs || []).reduce(function (acc, job) {
    if (job.kind !== 'outlier') return acc;
    return acc + job.sets.length - 1;
  }, 0);
}

export { LAB_CONSOLIDATION_WINDOW_MS, labTimestampMsFromFechaHora };
