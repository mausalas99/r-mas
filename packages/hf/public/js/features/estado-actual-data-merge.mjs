import { MED_FIELD_KEYS } from './estado-actual-data-constants.mjs';
import { emptyEstadoClinico, emptyPendienteReceta } from './estado-actual-data-model.mjs';

const DIET_KEYS = ['dieta', 'kcal', 'proteinG'];
const EC_SCALAR_KEYS = ['four', 'esferas', 'soporte', 'kcalKg', 'tempContext', 'pesoRef'];

/**
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 */
function compareSavedAt(a, b) {
  if ((a == null || a === '') && (b == null || b === '')) return 0;
  if (a == null || a === '') return -1;
  if (b == null || b === '') return 1;
  return String(a).localeCompare(String(b));
}

/**
 * @param {unknown} row
 */
function medicionMergeKey(row) {
  if (!row || typeof row !== 'object') return '';
  /** @type {any} */
  var r = row;
  if (r.recordedAt != null && String(r.recordedAt).trim()) return String(r.recordedAt);
  if (r.createdAt != null && String(r.createdAt).trim()) return String(r.createdAt);
  return String(r.id || '');
}

/**
 * Union vitals historial by medicion id; newer recordedAt wins per row.
 * @param {unknown[]} localHist
 * @param {unknown[]} remoteHist
 */
function mergeHistorialMonitoreo(localHist, remoteHist) {
  /** @type {Map<string, object>} */
  var map = new Map();
  var combined = (localHist || []).concat(remoteHist || []);
  for (var i = 0; i < combined.length; i += 1) {
    var row = combined[i];
    if (!row || typeof row !== 'object') continue;
    /** @type {any} */
    var r = row;
    var id = String(r.id || '').trim();
    if (!id) continue;
    var cur = map.get(id);
    if (!cur || compareSavedAt(medicionMergeKey(r), medicionMergeKey(cur)) > 0) {
      map.set(id, structuredClone(r));
    }
  }
  return Array.from(map.values()).sort(function (a, b) {
    return compareSavedAt(medicionMergeKey(a), medicionMergeKey(b));
  });
}

/**
 * @param {Record<string, unknown>} resEco
 * @param {Record<string, unknown>} remEco
 * @param {string | null | undefined} localAt
 * @param {string | null | undefined} remoteAt
 */
function mergeEstadoClinicoScalars(resEco, remEco, localAt, remoteAt) {
  var remoteNewer = compareSavedAt(remoteAt, localAt) > 0;
  for (var sk = 0; sk < EC_SCALAR_KEYS.length; sk += 1) {
    var scalarKey = EC_SCALAR_KEYS[sk];
    var localScalar = String(resEco[scalarKey] || '').trim();
    var remoteScalar = String(remEco[scalarKey] || '').trim();
    if (remoteNewer) {
      if (remoteScalar || !localScalar) resEco[scalarKey] = remEco[scalarKey];
    } else if (!localScalar && remoteScalar) {
      resEco[scalarKey] = remEco[scalarKey];
    }
  }
}

/**
 * @param {Record<string, unknown>} resEco
 * @param {Record<string, unknown>} resCf
 * @param {Record<string, unknown>} remEco
 * @param {Record<string, unknown>} remCf
 */
function mergeConfirmedMedFields(resEco, resCf, remEco, remCf) {
  for (var mk of MED_FIELD_KEYS) {
    if (remCf[mk] && !resCf[mk]) {
      resEco[mk] = remEco[mk];
      resCf[mk] = true;
    }
  }
}

/**
 * @param {Record<string, unknown>} result
 * @param {Record<string, unknown>} resEco
 * @param {Record<string, unknown>} resCf
 * @param {Record<string, unknown>} local
 * @param {Record<string, unknown>} remote
 */
function pendienteOf(monitoreo) {
  return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
    ? monitoreo.pendienteReceta
    : {};
}

function mergeDietPending(result, resEco, resCf, local, remote) {
  var locPend = pendienteOf(local);
  var remPend = pendienteOf(remote);
  /** @type {any} */
  var remEco = remote.estadoClinico || emptyEstadoClinico();
  /** @type {any} */
  var remCf = remote.confirmado || {};

  if (!result.pendienteReceta || typeof result.pendienteReceta !== 'object') {
    result.pendienteReceta = emptyPendienteReceta();
  }

  if (resCf.dieta || String(resEco.dieta || '').trim()) {
    clearDietPending(result.pendienteReceta);
    return;
  }
  if (remCf.dieta && String(remEco.dieta || '').trim()) {
    applyRemoteConfirmedDiet(resEco, remEco, result.pendienteReceta, resCf);
    return;
  }
  mergeDietPendingFields(result.pendienteReceta, locPend, remPend);
  if (resCf.dieta == null) resCf.dieta = !!remCf.dieta;
}

/**
 * @param {Record<string, unknown>} pendienteReceta
 */
function clearDietPending(pendienteReceta) {
  for (var dk of DIET_KEYS) pendienteReceta[dk] = '';
}

/**
 * @param {Record<string, unknown>} resEco
 * @param {Record<string, unknown>} remEco
 * @param {Record<string, unknown>} pendienteReceta
 * @param {Record<string, unknown>} resCf
 */
function applyRemoteConfirmedDiet(resEco, remEco, pendienteReceta, resCf) {
  for (var dk2 of DIET_KEYS) {
    resEco[dk2] = remEco[dk2];
    pendienteReceta[dk2] = '';
  }
  resCf.dieta = true;
}

/**
 * @param {Record<string, unknown>} pendienteReceta
 * @param {Record<string, unknown>} locPend
 * @param {Record<string, unknown>} remPend
 */
function mergeDietPendingFields(pendienteReceta, locPend, remPend) {
  for (var dk3 of DIET_KEYS) {
    var localPending = locPend[dk3];
    var remotePending = remPend[dk3];
    if (localPending != null && String(localPending).trim()) {
      pendienteReceta[dk3] = String(localPending).trim();
    } else if (remotePending != null && String(remotePending).trim()) {
      pendienteReceta[dk3] = String(remotePending).trim();
    } else {
      pendienteReceta[dk3] = '';
    }
  }
}

/** @param {any} result @param {any} remote */
function mergeTextoGuardadoLww(result, remote) {
  var locT = result.textoGuardado || { text: '', savedAt: null };
  var remT = remote.textoGuardado || { text: '', savedAt: null };
  result.textoGuardado =
    compareSavedAt(remT.savedAt, locT.savedAt) > 0
      ? structuredClone(remT)
      : structuredClone(locT);
}

/** @param {any} result @param {string} localEcAt @param {string} remoteEcAt */
function applyEstadoClinicoUpdatedAt(result, localEcAt, remoteEcAt) {
  if (compareSavedAt(remoteEcAt, localEcAt) > 0) {
    result.estadoClinicoUpdatedAt = remoteEcAt;
  } else if (localEcAt) {
    result.estadoClinicoUpdatedAt = localEcAt;
  }
}

/**
 * @param {unknown} localIn
 * @param {unknown} remoteIn
 */
export function mergeMonitoreo(localIn, remoteIn) {
  var local = /** @type {any} */ (structuredClone(localIn));
  var remote = /** @type {any} */ (structuredClone(remoteIn));

  var lHist = Array.isArray(local?.historial) ? local.historial : [];
  var rHist = Array.isArray(remote?.historial) ? remote.historial : [];
  /** @type {any} */
  var result = /** @type {any} */ (structuredClone(localIn));
  result.historial = mergeHistorialMonitoreo(lHist, rHist);
  mergeTextoGuardadoLww(result, remote);

  /** @type {any} */
  var resEco = result.estadoClinico || emptyEstadoClinico();
  /** @type {any} */
  var resCf = result.confirmado || {};
  /** @type {any} */
  var remEco = remote.estadoClinico || emptyEstadoClinico();
  /** @type {any} */
  var remCf = remote.confirmado || {};

  var localEcAt =
    local && local.estadoClinicoUpdatedAt != null ? String(local.estadoClinicoUpdatedAt) : '';
  var remoteEcAt =
    remote && remote.estadoClinicoUpdatedAt != null ? String(remote.estadoClinicoUpdatedAt) : '';
  mergeEstadoClinicoScalars(resEco, remEco, localEcAt, remoteEcAt);
  mergeConfirmedMedFields(resEco, resCf, remEco, remCf);
  mergeDietPending(result, resEco, resCf, local, remote);

  result.estadoClinico = resEco;
  result.confirmado = resCf;
  applyEstadoClinicoUpdatedAt(result, localEcAt, remoteEcAt);
  return result;
}
