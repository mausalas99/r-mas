/**
 * R+ Móvil / Nube — diagnóstico del pipeline labSidecars → labHistory local.
 */
import { isCloudMobileClient } from './origin.mjs';
import { labHistory, patients } from '../../app-state.mjs';
import { getCloudSyncRevision, getCloudSyncRoomId } from '../cloud-sync/settings.mjs';
import { hasActiveCloudNetworkFailure } from '../cloud-sync/cloud-sync-diagnostics.mjs';
import { MOBILE_LAB_HISTORY_DAYS } from '../../../../lib/lab-mobile-history-window.mjs';

const MAX_TRACE = 12;

/** @type {Record<string, unknown>} */
let lastPullIngress = {};

/** @type {Record<string, unknown>} */
let lastApply = {};

/** @type {Record<string, unknown>} */
let lastPush = {};

/** @type {{ at: string, kind: string, detail: Record<string, unknown> }[]} */
const trace = [];

/** @param {string} kind @param {Record<string, unknown>} [detail] */
function pushTrace(kind, detail) {
  trace.unshift({
    at: new Date().toISOString(),
    kind: String(kind || 'event'),
    detail: detail && typeof detail === 'object' ? { ...detail } : {},
  });
  if (trace.length > MAX_TRACE) trace.length = MAX_TRACE;
}

/** @param {unknown} state */
export function countLabSidecarsInState(state) {
  const map = state && typeof state === 'object' ? /** @type {{ labSidecars?: unknown }} */ (state).labSidecars : null;
  if (!map || typeof map !== 'object') return { patients: 0, sets: 0 };
  let patients = 0;
  let sets = 0;
  Object.keys(map).forEach(function (patientId) {
    const row = /** @type {Record<string, unknown>} */ (map)[patientId];
    if (!row || typeof row !== 'object') return;
    const n = Object.keys(row).length;
    if (!n) return;
    patients += 1;
    sets += n;
  });
  return { patients, sets };
}

/** @param {unknown} result */
export function countLabOpsInPullResult(result) {
  if (!result || typeof result !== 'object') return 0;
  const row = /** @type {{ needSnapshot?: boolean, state?: unknown, ops?: unknown[] }} */ (result);
  if (row.needSnapshot && row.state) return countLabSidecarsInState(row.state).sets;
  const ops = Array.isArray(row.ops) ? row.ops : [];
  let n = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (String(ops[i]?.path || '').startsWith('labSidecars/')) n += 1;
  }
  return n;
}

/**
 * @param {{ needSnapshot?: boolean, revision?: number, opsCount?: number, labOpsInPayload?: number, rawSidecars?: { patients: number, sets: number }, filteredSidecars?: { patients: number, sets: number } }} row
 */
export function recordLabPullIngress(row) {
  lastPullIngress = {
    at: new Date().toISOString(),
    needSnapshot: !!row?.needSnapshot,
    revision: row?.revision != null ? Number(row.revision) : null,
    opsCount: Number(row?.opsCount || 0),
    labOpsInPayload: Number(row?.labOpsInPayload || 0),
    rawSidecars: row?.rawSidecars || { patients: 0, sets: 0 },
    filteredSidecars: row?.filteredSidecars || row?.rawSidecars || { patients: 0, sets: 0 },
  };
  pushTrace('pull_ingress', lastPullIngress);
}

/** @param {{ patients: number, sets: number }} filteredSidecars */
export function updateLabPullIngressFilter(filteredSidecars) {
  if (!lastPullIngress.at) return;
  lastPullIngress.filteredSidecars = filteredSidecars;
  pushTrace('pull_filter', { filteredSidecars });
}

/**
 * @param {{ patientsUpdated?: number, labSetsReceived?: number, labSetsKeptAfterWindow?: number, activePatientId?: string | null }} row
 */
export function recordLabPullApply(row) {
  lastApply = {
    at: new Date().toISOString(),
    patientsUpdated: Number(row?.patientsUpdated || 0),
    labSetsReceived: Number(row?.labSetsReceived || 0),
    labSetsKeptAfterWindow: Number(row?.labSetsKeptAfterWindow || 0),
    activePatientId: row?.activePatientId != null ? String(row.activePatientId) : null,
  };
  pushTrace('pull_apply', lastApply);
}

/**
 * @param {{ patientId?: string, setCount?: number, ok?: boolean, reason?: string, totalOps?: number }} row
 */
export function recordLabPushAttempt(row) {
  lastPush = {
    at: new Date().toISOString(),
    patientId: String(row?.patientId || ''),
    setCount: Number(row?.setCount || 0),
    ok: !!row?.ok,
    reason: String(row?.reason || ''),
    totalOps: Number(row?.totalOps || 0),
  };
  pushTrace('push', lastPush);
}

/** @param {string | null | undefined} activePatientId */
export function summarizeLocalLabHistory(activePatientId) {
  let patientsWithLabs = 0;
  let totalSets = 0;
  Object.keys(labHistory || {}).forEach(function (pid) {
    const n = Array.isArray(labHistory[pid]) ? labHistory[pid].length : 0;
    if (!n) return;
    patientsWithLabs += 1;
    totalSets += n;
  });
  const pid = String(activePatientId || '').trim();
  const activeSets = pid && Array.isArray(labHistory[pid]) ? labHistory[pid].length : 0;
  const activePatient =
    pid &&
    patients.find(function (p) {
      return p && String(p.id) === pid;
    });
  return {
    patientsWithLabs,
    totalSets,
    activePatientId: pid || null,
    activePatientName: activePatient ? String(activePatient.nombre || '').trim() : '',
    activeSets,
  };
}

/** @returns {string[]} */
function buildCloudNetworkLabIssues() {
  if (!hasActiveCloudNetworkFailure()) return [];
  return [
    'Sin contacto estable con Nube (Failed to fetch / red intermitente). Revisa Wi‑Fi o VPN, recarga R+ Móvil y usa Forzar pull cuando la red esté bien. Hasta entonces los labs no bajarán ni la cola local se enviará.',
  ];
}

/**
 * @param {{ activePatientId?: string | null }} [opts]
 */
export function buildLabSyncDiagnosticsIssues(opts) {
  const local = summarizeLocalLabHistory(opts?.activePatientId);
  /** @type {string[]} */
  const issues = [...buildCloudNetworkLabIssues()];
  const ingress = lastPullIngress;
  const apply = lastApply;
  const networkBlocking = issues.length > 0;

  if (!ingress.at) {
    if (!networkBlocking) {
      issues.push('Aún no hay un pull Nube registrado en esta sesión.');
    }
  } else if (
    !networkBlocking &&
    Number(ingress.labOpsInPayload || 0) === 0 &&
    Number(ingress.rawSidecars?.sets || 0) === 0
  ) {
    issues.push(
      'El último pull no trajo labSidecars. En escritorio: reinicia R+ con el código nuevo, reconecta Nube y procesa o re-sincroniza labs.'
    );
  }

  if (ingress.at && Number(ingress.rawSidecars?.sets || 0) > Number(ingress.filteredSidecars?.sets || 0)) {
    issues.push(
      'El worker filtró ' +
        (Number(ingress.rawSidecars.sets) - Number(ingress.filteredSidecars.sets)) +
        ' estudio(s) por ventana móvil (' +
        MOBILE_LAB_HISTORY_DAYS +
        ' días).'
    );
  }

  if (local.totalSets > 0 && local.activeSets === 0 && local.activePatientId) {
    issues.push(
      'Hay labs en el dispositivo para otros pacientes, pero el paciente activo no tiene estudios en ventana móvil.'
    );
  }

  if (apply.at && Number(apply.labSetsReceived || 0) > 0 && local.activeSets === 0 && local.activePatientId) {
    issues.push('Se aplicaron labSidecars en pull pero el paciente activo sigue sin historial local.');
  }

  if (lastPush.at && !lastPush.ok) {
    issues.push('Último push de labs desde escritorio falló: ' + (lastPush.reason || 'desconocido') + '.');
  }

  if (!issues.length && local.activeSets === 0 && local.activePatientId) {
    issues.push('Sin estudios locales para el paciente activo tras el último pull.');
  }

  return issues;
}

/**
 * @param {{ activePatientId?: string | null }} [opts]
 */
export function getLabSyncDiagnosticsSnapshot(opts) {
  const local = summarizeLocalLabHistory(opts?.activePatientId);
  return {
    at: new Date().toISOString(),
    client: isCloudMobileClient() ? 'mobile' : 'desktop',
    revision: Number(getCloudSyncRevision() || 0),
    roomId: String(getCloudSyncRoomId() || ''),
    mobileWindowDays: MOBILE_LAB_HISTORY_DAYS,
    local,
    lastPullIngress: { ...lastPullIngress },
    lastApply: { ...lastApply },
    lastPush: { ...lastPush },
    issues: buildLabSyncDiagnosticsIssues(opts),
    trace: trace.map(function (row) {
      return { at: row.at, kind: row.kind, detail: { ...row.detail } };
    }),
  };
}

/**
 * @param {{ activePatientId?: string | null }} [opts]
 */
export function formatLabSyncDiagnosticsText(opts) {
  const snap = getLabSyncDiagnosticsSnapshot(opts);
  const lines = [
    '=== R+ Labs · diagnóstico Nube ===',
    'Generado: ' + snap.at,
    'Cliente: ' + snap.client,
    'Sala: ' + (snap.roomId || '(sin sala)') + ' · rev ' + snap.revision,
    '',
    'Paciente activo: ' + (snap.local.activePatientName || snap.local.activePatientId || '(ninguno)'),
    'Labs locales (activo): ' + snap.local.activeSets,
    'Labs locales (todos): ' + snap.local.totalSets + ' en ' + snap.local.patientsWithLabs + ' paciente(s)',
    '',
    'Último pull:',
    snap.lastPullIngress.at
      ? '  ' +
        snap.lastPullIngress.at +
        ' · snapshot=' +
        (snap.lastPullIngress.needSnapshot ? 'sí' : 'no') +
        ' · ops=' +
        snap.lastPullIngress.opsCount +
        ' · labOps=' +
        snap.lastPullIngress.labOpsInPayload +
        ' · sidecars raw ' +
        snap.lastPullIngress.rawSidecars.sets +
        ' → filtrados ' +
        snap.lastPullIngress.filteredSidecars.sets
      : '  (ninguno)',
    '',
    'Última aplicación:',
    snap.lastApply.at
      ? '  ' +
        snap.lastApply.at +
        ' · recibidos=' +
        snap.lastApply.labSetsReceived +
        ' · en ventana=' +
        snap.lastApply.labSetsKeptAfterWindow +
        ' · pacientes tocados=' +
        snap.lastApply.patientsUpdated
      : '  (ninguna)',
    '',
    'Último push escritorio:',
    snap.lastPush.at
      ? '  ' +
        snap.lastPush.at +
        ' · paciente=' +
        (snap.lastPush.patientId || '—') +
        ' · sets=' +
        snap.lastPush.setCount +
        ' · ok=' +
        (snap.lastPush.ok ? 'sí' : 'no') +
        (snap.lastPush.reason ? ' · ' + snap.lastPush.reason : '')
      : '  (ninguno — normal en iPad)',
    '',
    'Problemas detectados:',
  ];
  if (!snap.issues.length) lines.push('  (ninguno obvio)');
  else snap.issues.forEach(function (msg) {
    lines.push('  • ' + msg);
  });
  lines.push('', 'Traza reciente:');
  if (!snap.trace.length) lines.push('  (vacía)');
  else {
    snap.trace.slice(0, 8).forEach(function (row) {
      lines.push('  ' + row.at + ' [' + row.kind + '] ' + JSON.stringify(row.detail));
    });
  }
  return lines.join('\n');
}

function diagHost() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('lab-mobile-sync-diag');
}

/** Removes legacy in-lab diag chrome if a prior build left it mounted. */
export function ensureLabMobileSyncDiagPanel() {
  if (typeof document === 'undefined') return null;
  var host = diagHost();
  if (host && host.parentNode) host.parentNode.removeChild(host);
  return null;
}

/** @param {string | null | undefined} activePatientId */
export function refreshLabMobileSyncDiagPanel(activePatientId) {
  void activePatientId;
  ensureLabMobileSyncDiagPanel();
}

export function toggleLabMobileSyncDiag() {
  ensureLabMobileSyncDiagPanel();
}

export async function copyLabMobileSyncDiag() {
  ensureLabMobileSyncDiagPanel();
}

/** Still available for console / future tools — no in-lab chrome. */
export async function forceLabMobileSyncPull() {
  ensureLabMobileSyncDiagPanel();
  if (!isCloudMobileClient()) return;
  try {
    const { getCloudMobileRuntime } = await import('./runtime.mjs');
    const runtime = getCloudMobileRuntime();
    if (!runtime?.syncCycle) {
      const { showToast } = await import('../../ui-toast.mjs');
      showToast('Sync Nube no está activo en esta sesión', 'error');
      return;
    }
    const { showToast } = await import('../../ui-toast.mjs');
    showToast('Sincronizando con Nube…', 'info');
    await runtime.syncCycle();
    const { refreshMobileLabReferencePanel } = await import('../../mobile-web.mjs');
    refreshMobileLabReferencePanel();
    showToast('Sincronización completada', 'success');
  } catch (err) {
    const { showToast } = await import('../../ui-toast.mjs');
    showToast('Sync falló: ' + (err?.message || String(err)), 'error');
  }
}

export function clearLabSyncDiagnostics() {
  lastPullIngress = {};
  lastApply = {};
  lastPush = {};
  trace.length = 0;
}
