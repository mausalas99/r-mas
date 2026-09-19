/**
 * monitoreo (vitals + estado actual) is a rich per-patient blob, not a scalar field.
 * A plain whole-blob LWW replace (like other entry fields get) wipes whichever side
 * loses the updatedAt race — e.g. desktop's full vitals historial vs. a device that
 * pushes with a newer timestamp but fewer rows cached. Mirrors the client-side merge
 * in public/js/features/estado-actual-data-merge.mjs (kept as a worker-local copy,
 * same pattern as clinical-ops-lww.js — the Worker does not import client renderer code).
 */

const MED_FIELD_KEYS = [
  'analgesia',
  'antiemeticos',
  'sedacion',
  'antiepilepticos',
  'antiparkinsonianos',
  'antidotos',
  'viaAerea',
  'abx',
  'transfusiones',
  'antihta',
  'diureticos',
  'antitromboticos',
];

const DIET_KEYS = ['dieta', 'kcal', 'proteinG'];
const EC_SCALAR_KEYS = ['four', 'esferas', 'soporte', 'kcalKg', 'tempContext', 'pesoRef'];

function emptyEstadoClinico() {
  /** @type {Record<string, string>} */
  const out = { four: '', esferas: '' };
  for (const mk of MED_FIELD_KEYS) out[mk] = '';
  out.soporte = '';
  out.kcalKg = '';
  out.tempContext = '';
  out.pesoRef = '';
  out.dieta = '';
  out.kcal = '';
  out.proteinG = '';
  return out;
}

function emptyPendienteReceta() {
  /** @type {Record<string, string>} */
  const o = {};
  for (const k of Object.keys(emptyEstadoClinico())) o[k] = '';
  return o;
}

/** @param {string | null | undefined} a @param {string | null | undefined} b */
function compareSavedAt(a, b) {
  if ((a == null || a === '') && (b == null || b === '')) return 0;
  if (a == null || a === '') return -1;
  if (b == null || b === '') return 1;
  return String(a).localeCompare(String(b));
}

/** @param {unknown} row */
function medicionMergeKey(row) {
  if (!row || typeof row !== 'object') return '';
  const r = /** @type {any} */ (row);
  if (r.recordedAt != null && String(r.recordedAt).trim()) return String(r.recordedAt);
  if (r.createdAt != null && String(r.createdAt).trim()) return String(r.createdAt);
  return String(r.id || '');
}

/** Union vitals historial by medicion id; newer recordedAt/createdAt wins per row. */
function mergeHistorialMonitoreo(localHist, remoteHist) {
  const map = new Map();
  const combined = (localHist || []).concat(remoteHist || []);
  for (const row of combined) {
    if (!row || typeof row !== 'object') continue;
    const r = /** @type {any} */ (row);
    const id = String(r.id || '').trim();
    if (!id) continue;
    const cur = map.get(id);
    if (!cur || compareSavedAt(medicionMergeKey(r), medicionMergeKey(cur)) > 0) {
      map.set(id, structuredClone(r));
    }
  }
  return Array.from(map.values()).sort((a, b) => compareSavedAt(medicionMergeKey(a), medicionMergeKey(b)));
}

function mergeEstadoClinicoScalars(resEco, remEco, localAt, remoteAt) {
  const remoteNewer = compareSavedAt(remoteAt, localAt) > 0;
  for (const scalarKey of EC_SCALAR_KEYS) {
    const localScalar = String(resEco[scalarKey] || '').trim();
    const remoteScalar = String(remEco[scalarKey] || '').trim();
    if (remoteNewer) {
      if (remoteScalar || !localScalar) resEco[scalarKey] = remEco[scalarKey];
    } else if (!localScalar && remoteScalar) {
      resEco[scalarKey] = remEco[scalarKey];
    }
  }
}

function mergeConfirmedMedFields(resEco, resCf, remEco, remCf) {
  for (const mk of MED_FIELD_KEYS) {
    if (remCf[mk] && !resCf[mk]) {
      resEco[mk] = remEco[mk];
      resCf[mk] = true;
    }
  }
}

function pendienteOf(monitoreo) {
  return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
    ? monitoreo.pendienteReceta
    : {};
}

function clearDietPending(pendienteReceta) {
  for (const dk of DIET_KEYS) pendienteReceta[dk] = '';
}

function applyRemoteConfirmedDiet(resEco, remEco, pendienteReceta, resCf) {
  for (const dk of DIET_KEYS) {
    resEco[dk] = remEco[dk];
    pendienteReceta[dk] = '';
  }
  resCf.dieta = true;
}

function mergeDietPendingFields(pendienteReceta, locPend, remPend) {
  for (const dk of DIET_KEYS) {
    const localPending = locPend[dk];
    const remotePending = remPend[dk];
    if (localPending != null && String(localPending).trim()) {
      pendienteReceta[dk] = String(localPending).trim();
    } else if (remotePending != null && String(remotePending).trim()) {
      pendienteReceta[dk] = String(remotePending).trim();
    } else {
      pendienteReceta[dk] = '';
    }
  }
}

function mergeDietPending(result, resEco, resCf, local, remote) {
  const locPend = pendienteOf(local);
  const remPend = pendienteOf(remote);
  const remEco = remote.estadoClinico || emptyEstadoClinico();
  const remCf = remote.confirmado || {};

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

function mergeTextoGuardadoLww(result, remote) {
  const locT = result.textoGuardado || { text: '', savedAt: null };
  const remT = remote.textoGuardado || { text: '', savedAt: null };
  result.textoGuardado =
    compareSavedAt(remT.savedAt, locT.savedAt) > 0 ? structuredClone(remT) : structuredClone(locT);
}

function applyEstadoClinicoUpdatedAt(result, localEcAt, remoteEcAt) {
  if (compareSavedAt(remoteEcAt, localEcAt) > 0) {
    result.estadoClinicoUpdatedAt = remoteEcAt;
  } else if (localEcAt) {
    result.estadoClinicoUpdatedAt = localEcAt;
  }
}

/**
 * @param {unknown} localIn currently stored monitoreo
 * @param {unknown} remoteIn incoming pushed monitoreo
 */
export function mergeMonitoreoLww(localIn, remoteIn) {
  if (!localIn || typeof localIn !== 'object') return remoteIn;
  if (!remoteIn || typeof remoteIn !== 'object') return localIn;

  const local = structuredClone(localIn);
  const remote = structuredClone(remoteIn);

  const lHist = Array.isArray(local?.historial) ? local.historial : [];
  const rHist = Array.isArray(remote?.historial) ? remote.historial : [];
  const result = structuredClone(localIn);
  result.historial = mergeHistorialMonitoreo(lHist, rHist);
  mergeTextoGuardadoLww(result, remote);

  const resEco = result.estadoClinico || emptyEstadoClinico();
  const resCf = result.confirmado || {};
  const remEco = remote.estadoClinico || emptyEstadoClinico();
  const remCf = remote.confirmado || {};

  const localEcAt = local && local.estadoClinicoUpdatedAt != null ? String(local.estadoClinicoUpdatedAt) : '';
  const remoteEcAt = remote && remote.estadoClinicoUpdatedAt != null ? String(remote.estadoClinicoUpdatedAt) : '';
  mergeEstadoClinicoScalars(resEco, remEco, localEcAt, remoteEcAt);
  mergeConfirmedMedFields(resEco, resCf, remEco, remCf);
  mergeDietPending(result, resEco, resCf, local, remote);

  result.estadoClinico = resEco;
  result.confirmado = resCf;
  applyEstadoClinicoUpdatedAt(result, localEcAt, remoteEcAt);
  return result;
}
