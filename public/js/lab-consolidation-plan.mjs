/**
 * Plan de consolidación manual/automática del historial de laboratorio.
 */
import {
  clusterByTimeWindow,
  clusterLabConsolidationGroup,
  clusterLabworkByTimeWindow,
  labConsolidationFamily,
  labTimestampMsFromFechaHora,
  LAB_CONSOLIDATION_UNBOUNDED_WINDOW_MS,
  LAB_CONSOLIDATION_WINDOW_MS,
  resolveLabConsolidationWindowMs,
} from './lab-consolidation-cluster.mjs';

export function labDayTipoGroupKey(dayKey, tipo) {
  return String(dayKey || '') + '\x01' + labConsolidationFamily(tipo);
}

export function splitLabDayTipoGroupKey(gk) {
  var parts = String(gk || '').split('\x01');
  var family = parts[1] || 'labwork';
  return {
    dayKey: parts[0] || '',
    tipo: family === 'labwork' ? 'labs' : family,
    family: family,
  };
}

function defaultIsGasoOnly(getTipo) {
  return function (set) {
    return getTipo(set) === 'gaso';
  };
}

function groupSetsByDayFamily(sets, getDayKey, getTipo) {
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

function shouldOfferLabworkOutlier(arr, getMs, isGasoOnly, windowMs) {
  if (!arr || arr.length < 2) return false;
  if (arr.every(isGasoOnly)) return false;
  var clusters = clusterLabworkByTimeWindow(arr, getMs, isGasoOnly, windowMs);
  if (clusters.length < 2) return false;
  for (var i = 0; i < clusters.length; i++) {
    var cluster = clusters[i];
    if (cluster.length !== 1 || !isGasoOnly(cluster[0])) continue;
    for (var j = 0; j < clusters.length; j++) {
      if (i === j) continue;
      if (clusters[j].some(isGasoOnly)) return false;
    }
  }
  return true;
}

function shouldOfferConsolidationOutlier(arr, split, getMs, getTipo, isGasoOnly, windowMs) {
  if (split.family === 'labwork') {
    return shouldOfferLabworkOutlier(arr, getMs, isGasoOnly, windowMs);
  }
  var clusters = clusterByTimeWindow(arr, getMs, resolveLabConsolidationWindowMs(split.tipo, windowMs));
  return clusters.length >= 2;
}

/**
 * Grupos mismo día+familia con ≥2 clusters horarios (>2 h entre bloques).
 */
export function findOutlierLabConsolidationGroups(
  sets,
  getDayKey,
  getTipo,
  getMs,
  isGasoOnly,
  windowMs
) {
  var gasoFn = typeof isGasoOnly === 'function' ? isGasoOnly : defaultIsGasoOnly(getTipo);
  var groups = groupSetsByDayFamily(sets, getDayKey, getTipo);
  var outliers = [];
  Object.keys(groups).forEach(function (gk) {
    var arr = groups[gk];
    if (arr.length < 2) return;
    var split = splitLabDayTipoGroupKey(gk);
    if (!shouldOfferConsolidationOutlier(arr, split, getMs, getTipo, gasoFn, windowMs)) return;
    var clusters = clusterLabConsolidationGroup(arr, getMs, getTipo, gasoFn, windowMs);
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
  isGasoOnly,
  windowMs
) {
  var gasoFn = typeof isGasoOnly === 'function' ? isGasoOnly : defaultIsGasoOnly(getTipo);
  var outlierSet =
    outlierGroupKeys instanceof Set
      ? outlierGroupKeys
      : outlierGroupKeys
        ? new Set(outlierGroupKeys)
        : new Set();
  var groups = groupSetsByDayFamily(sets, getDayKey, getTipo);
  var jobs = [];
  Object.keys(groups).forEach(function (gk) {
    var arr = groups[gk];
    if (arr.length < 2) return;
    var split = splitLabDayTipoGroupKey(gk);
    if (outlierSet.has(gk)) {
      if (split.family === 'labwork') {
        clusterLabworkByTimeWindow(arr, getMs, gasoFn, LAB_CONSOLIDATION_UNBOUNDED_WINDOW_MS).forEach(function (cluster) {
          if (cluster.length >= 2) {
            jobs.push({ groupKey: gk, kind: 'outlier', sets: cluster.slice() });
          }
        });
      } else {
        jobs.push({ groupKey: gk, kind: 'outlier', sets: arr.slice() });
      }
      return;
    }
    clusterLabConsolidationGroup(arr, getMs, getTipo, gasoFn, windowMs).forEach(function (cluster) {
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

/** Resumen compacto de secciones (BH · QS · GASES) para UI de consolidación. */
export function labSetSectionSummary(resLabs) {
  var seen = Object.create(null);
  var keys = [];
  (resLabs || []).forEach(function (row) {
    var s = String(row || '').trim();
    if (!s) return;
    var m = s.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
    if (!m) return;
    var k = m[1].toUpperCase();
    if (seen[k]) return;
    seen[k] = true;
    keys.push(k);
  });
  return keys.join(' · ');
}

/**
 * Sets elegibles para consolidación manual (día conocido, no mixtos).
 * @returns {object[]}
 */
export function listLabConsolidationCandidates(sets, getDayKey, getTipo) {
  return (sets || []).filter(function (set) {
    if (!set || set.id == null) return false;
    var tipo = getTipo(set);
    if (tipo === 'mixed') return false;
    var dk = getDayKey(set);
    return !!(dk && dk !== 'unknown' && dk !== 'Anterior');
  });
}

/**
 * Valida un grupo manual: ≥2 ids, mismo día, misma familia (labwork|cultivo).
 * @returns {{ ok: true, dayKey: string, family: string } | { ok: false, error: string }}
 */
export function validateManualConsolidationGroup(setIds, setsById, getDayKey, getTipo) {
  var ids = (setIds || []).map(String).filter(Boolean);
  if (ids.length < 2) return { ok: false, error: 'Selecciona al menos 2 conjuntos' };
  var dayKey = '';
  var family = '';
  for (var i = 0; i < ids.length; i++) {
    var set = setsById[ids[i]];
    if (!set) return { ok: false, error: 'Conjunto no encontrado' };
    var tipo = getTipo(set);
    if (tipo === 'mixed') return { ok: false, error: 'No se pueden fusionar conjuntos mixtos' };
    var dk = getDayKey(set);
    if (!dk || dk === 'unknown' || dk === 'Anterior') {
      return { ok: false, error: 'Solo conjuntos con fecha conocida' };
    }
    var fam = labConsolidationFamily(tipo);
    if (!dayKey) {
      dayKey = dk;
      family = fam;
      continue;
    }
    if (dk !== dayKey) return { ok: false, error: 'Los conjuntos del grupo deben ser del mismo día' };
    if (fam !== family) {
      return { ok: false, error: 'No mezcles laboratorio con cultivos en el mismo grupo' };
    }
  }
  return { ok: true, dayKey: dayKey, family: family };
}

/**
 * Jobs de merge a partir de grupos elegidos por el usuario (sin auto ≤2 h ni día completo).
 * @param {string[][]} groups — cada grupo es lista de set ids
 * @param {Record<string, object>} setsById
 */
export function buildManualLabConsolidationJobs(groups, setsById) {
  var jobs = [];
  var used = Object.create(null);
  (groups || []).forEach(function (ids) {
    var arr = [];
    (ids || []).forEach(function (id) {
      var sid = String(id);
      if (used[sid]) return;
      var set = setsById[sid];
      if (!set) return;
      arr.push(set);
    });
    if (arr.length < 2) return;
    arr.forEach(function (set) {
      used[String(set.id)] = true;
    });
    jobs.push({ groupKey: 'manual', kind: 'manual', sets: arr });
  });
  return jobs;
}

export { LAB_CONSOLIDATION_WINDOW_MS, labTimestampMsFromFechaHora };
