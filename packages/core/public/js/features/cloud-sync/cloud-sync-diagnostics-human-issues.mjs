/** Issue and recent-error builders for the human-readable Nube sync diagnostics view. */

import { CLOUD_LAB_BACKFILL_MUTATION_ID } from './constants.mjs';
import {
  CLOUD_PUSH_WARN_BODY_BYTES,
} from './cloud-op-slim.mjs';
import { isToxicCloudOutboxEntry } from './cloud-sync-diagnostics.mjs';
import {
  CLOUD_SYNC_CLIENT_NOT_READY,
  isCloudSyncNetworkErrorMessage,
} from './cloud-sync-error-text.mjs';
import { resolveCloudErrorFixId } from './cloud-nube-fix-guides.mjs';
import {
  explainWsCloseCode,
  formatCloudDiagWhen,
  humanizeCloudSyncError,
} from './cloud-sync-diagnostics-human-format.mjs';

export const OUTBOX_KIND_LABELS = {
  signos: 'signos',
  pendientes: 'pendientes',
  censo: 'censo',
  eventualidades: 'eventualidades',
  agenda: 'agenda',
  delete: 'borrados',
  patient: 'paciente',
  clinicalOps: 'operaciones',
  labs: 'labs',
  other: 'otros',
};

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} diag
 */
export function isSyncFailureActive(diag) {
  const status = String(diag.status || 'unknown');
  return status === 'error' || diag.lastCycleOk === false;
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} diag
 * @param {string} transport
 * @param {{ code: number, reason: string }} wsClose
 */
export function isWsCloseStillActive(diag, transport, wsClose) {
  const code = Number(wsClose.code) || 0;
  if (!code || code === 1000 || code === 1001) return false;
  if (transport === 'ws') {
    return code === 1008 || code === 1011;
  }
  if (code === 1006) {
    return isSyncFailureActive(diag);
  }
  return true;
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} diag
 * @param {string} transport
 */
export function isWsErrorStillActive(diag, transport) {
  if (!diag.lastWsError) return false;
  if (transport === 'ws') return false;
  return isSyncFailureActive(diag) || transport === 'offline' || diag.online === false;
}

/**
 * @param {Array<{ op: string, explain: string, at: string, code: string, fixId: string }>} rows
 */
function dedupeRecentErrors(rows) {
  const seen = new Set();
  return rows.filter(function (row) {
    const key = row.op + '\0' + row.explain;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {Record<string, number>} byKind
 */
export function formatOutboxKinds(byKind) {
  const rows = Object.entries(byKind || {})
    .filter(function (pair) {
      return Number(pair[1]) > 0;
    })
    .map(function (pair) {
      const label = OUTBOX_KIND_LABELS[pair[0]] || pair[0];
      return Number(pair[1]) + ' ' + label;
    });
  return rows.join(', ');
}

/**
 * @param {number} bytes
 */
function formatCloudDiagBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return String(n) + ' B';
  if (n < 1024 * 1024) return String(Math.round(n / 1024)) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * @param {{ clientMutationId?: string, opCount?: number, totalBytes?: number, maxOpPath?: string | null, maxOpBytes?: number }} row
 */
function formatToxicOutboxDetail(row) {
  const id = String(row.clientMutationId || 'push');
  const total = formatCloudDiagBytes(row.totalBytes);
  let detail =
    '«' +
    id +
    '»: ' +
    String(row.opCount || 0) +
    ' ops, ~' +
    total +
    ' total.';
  const maxPath = String(row.maxOpPath || '').trim();
  if (maxPath) {
    detail += ' Mayor: ' + maxPath + ' (~' + formatCloudDiagBytes(row.maxOpBytes) + ').';
  }
  if (Number(row.totalBytes) > CLOUD_PUSH_WARN_BODY_BYTES) {
    detail += ' Límite servidor ~' + formatCloudDiagBytes(CLOUD_PUSH_WARN_BODY_BYTES) + '.';
  }
  return detail;
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} d
 * @param {number} now
 */
export function buildRecentErrorRows(d, now) {
  if (!isSyncFailureActive(d)) return [];
  return dedupeRecentErrors(
    (d.lastErrors || []).map(function (entry) {
      const human = humanizeCloudSyncError(entry);
      return {
        at: formatCloudDiagWhen(entry.at, now),
        op: human.op,
        explain: human.explain,
        code: String(entry.code || ''),
        fixId: resolveCloudErrorFixId({
          op: entry.op,
          code: entry.code,
          message: entry.message,
          explain: human.explain,
        }),
      };
    })
  );
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} d
 */
export function buildToxicOutboxRows(d) {
  return (Array.isArray(d.outbox?.entries) ? d.outbox.entries : [])
    .filter(isToxicCloudOutboxEntry)
    .sort(function (a, b) {
      return Number(b.totalBytes) - Number(a.totalBytes);
    });
}

function pushConnectivityIssues(issues, d, syncFailing, recentErrors) {
  if (d.online === false) {
    issues.push({
      fixId: 'no_internet',
      severity: 'warn',
      title: 'Sin internet',
      detail: 'No hay conexión de red. Los cambios se guardan localmente hasta recuperar red.',
    });
  } else if (
    syncFailing &&
    (recentErrors.some((row) => isCloudSyncNetworkErrorMessage(row.explain)) ||
      isCloudSyncNetworkErrorMessage(d.detail))
  ) {
    issues.push({
      fixId: 'network_unreachable',
      severity: 'error',
      title: 'Sin contacto estable con Nube',
      detail:
        'El dispositivo reporta internet, pero las peticiones a Nube fallan (Failed to fetch). Revisa Wi‑Fi, VPN o firewall; recarga R+ y reintenta cuando la red sea estable.',
      hint: 'El servidor de Nube puede estar bien; el problema suele ser la ruta de red del dispositivo.',
    });
  }

  if (d.cloudActive === false) {
    issues.push({
      fixId: 'cloud_not_active',
      severity: 'info',
      title: 'Nube no activa',
      detail: 'La sincronización con Nube está desactivada para esta guardia.',
    });
  }

  if (d.tokenPresent === false) {
    issues.push({
      fixId: 'no_session',
      severity: 'error',
      title: 'Sin sesión en Nube',
      detail: 'Inicia sesión en Conexión para sincronizar.',
    });
  }

  if (!String(d.roomId || '').trim()) {
    issues.push({
      fixId: 'no_room',
      severity: 'warn',
      title: 'Sin sala configurada',
      detail: 'Selecciona sala y equipo en Conexión.',
    });
  }

  if (d.bridgeConfigured === false) {
    issues.push({
      fixId: 'bridge_not_configured',
      severity: 'warn',
      title: 'Sync local no enlazado',
      detail: 'El runtime de Nube no está conectado a los cambios clínicos.',
    });
  }

  if (d.tokenPresent && String(d.roomId || '').trim() && d.runtimeActive === false) {
    issues.push({
      fixId: 'sync_not_active',
      severity: 'error',
      title: 'Sync no está activo',
      detail: CLOUD_SYNC_CLIENT_NOT_READY,
      hint: 'Tienes sesión y sala, pero el motor de sync no arrancó.',
    });
  }
}

function pushOutboxIssues(issues, d, outboxCount, toxicRows) {
  if (outboxCount > 0) {
    const kinds = formatOutboxKinds(d.outbox?.byKind);
    issues.push({
      fixId: 'outbox_pending',
      severity: 'warn',
      title: outboxCount + ' cambio' + (outboxCount !== 1 ? 's' : '') + ' pendiente' + (outboxCount !== 1 ? 's' : ''),
      detail: kinds
        ? 'En cola: ' + kinds + '. Usa «Reintentar cola Nube» si no se envían.'
        : 'Hay mutaciones en cola. Usa «Reintentar cola Nube» si no se envían.',
    });
  }

  if (toxicRows.length > 0) {
    const worst = toxicRows[0];
    const legacyBackfill =
      String(worst.clientMutationId || '') === CLOUD_LAB_BACKFILL_MUTATION_ID &&
      Number(worst.opCount) > 1;
    issues.push({
      fixId: legacyBackfill ? 'toxic_legacy_lab_backfill' : 'toxic_outbox_chunk',
      severity: 'error',
      title: legacyBackfill
        ? 'Labs en lote obsoleto (cliente antiguo)'
        : 'Lote pesado bloqueando la cola',
      detail: formatToxicOutboxDetail(worst),
      hint: legacyBackfill
        ? 'Actualiza R+ en esta Mac y en cualquier otra en la sala; luego «Reintentar cola» divide por paciente.'
        : '«Descartar labs en cola» si ya están en Nube, o «Reintentar cola» tras actualizar R+.',
    });
  }
}

function pushSyncStatusIssues(issues, d, now, status, recentErrors) {
  if (status === 'error' && recentErrors.length === 0) {
    issues.push({
      fixId: 'sync_error',
      severity: 'error',
      title: 'Error de sincronización',
      detail: String(d.detail || 'Revisa los últimos errores abajo.'),
    });
  }

  if (status === 'offline') {
    issues.push({
      fixId: 'cloud_offline',
      severity: 'warn',
      title: 'Sin conexión a Nube',
      detail: String(d.detail || 'No se puede contactar el servicio de sync.'),
    });
  }

  if (d.lastCycleOk === false && recentErrors.length === 0) {
    issues.push({
      fixId: 'cycle_failed',
      severity: 'error',
      title: 'El último ciclo de sync falló',
      detail: 'Último intento: ' + formatCloudDiagWhen(d.lastCycleAt, now) + '.',
    });
  }
}

function pushWsIssues(issues, d, transport, wsClose) {
  if (isWsErrorStillActive(d, transport)) {
    issues.push({
      fixId: 'ws_error',
      severity: 'warn',
      title: 'Error en canal en vivo',
      detail: String(d.lastWsError),
    });
  }

  if (isWsCloseStillActive(d, transport, wsClose)) {
    const abnormal = wsClose.code === 1006;
    const severity =
      wsClose.code === 1008 || wsClose.code === 1011 ? 'error' : abnormal && transport === 'poll' ? 'info' : 'warn';
    const hint =
      transport === 'poll'
        ? 'El sync sigue activo por sondeo HTTP cada pocos segundos.'
        : 'Se reintentará la conexión en vivo automáticamente.';
    issues.push({
      fixId: 'ws_close',
      severity,
      title: abnormal ? 'Canal en vivo interrumpido' : 'Canal en vivo cerrado',
      detail: explainWsCloseCode(wsClose.code, wsClose.reason),
      hint,
    });
  }
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} d
 * @param {number} now
 * @param {string} status
 * @param {string} transport
 * @param {{ code: number, reason: string }} wsClose
 * @param {Array} recentErrors
 * @param {number} outboxCount
 * @param {Array} toxicRows
 */
export function buildIssues(d, now, status, transport, wsClose, recentErrors, outboxCount, toxicRows) {
  const issues = [];
  const syncFailing = isSyncFailureActive(d);
  pushConnectivityIssues(issues, d, syncFailing, recentErrors);
  pushOutboxIssues(issues, d, outboxCount, toxicRows);
  pushSyncStatusIssues(issues, d, now, status, recentErrors);
  pushWsIssues(issues, d, transport, wsClose);
  return issues;
}

/**
 * @param {Array} toxicRows
 */
export function buildToxicOutboxSummary(toxicRows) {
  return toxicRows.slice(0, 3).map(function (row) {
    return {
      clientMutationId: String(row.clientMutationId || ''),
      opCount: Number(row.opCount) || 0,
      totalBytes: Number(row.totalBytes) || 0,
      totalLabel: formatCloudDiagBytes(row.totalBytes),
      maxOpPath: row.maxOpPath || null,
      maxOpBytes: Number(row.maxOpBytes) || 0,
      maxOpLabel: formatCloudDiagBytes(row.maxOpBytes),
      detail: formatToxicOutboxDetail(row),
    };
  });
}
