/** View section builders (facts, verdict, tiles, pipeline) for Nube sync diagnostics. */

import { humanizeTechnicalSyncMessage } from './cloud-sync-error-text.mjs';
import { STATUS_LABELS } from './panel-conexion-html.mjs';
import {
  cloudDiagTransportLabel,
  formatCloudDiagWhen,
} from './cloud-sync-diagnostics-human-format.mjs';
import { OUTBOX_KIND_LABELS, formatOutboxKinds } from './cloud-sync-diagnostics-human-issues.mjs';

/**
 * @param {{ name?: string, sala?: string, turnKey?: string, code?: string } | null} snapshot
 * @param {string} roomId
 */
export function formatRoomLabel(snapshot, roomId) {
  if (snapshot?.name) return String(snapshot.name);
  const sala = String(snapshot?.sala || '').trim();
  const turn = String(snapshot?.turnKey || '').trim();
  if (sala) return turn ? sala + ' · ' + turn : sala;
  const code = String(snapshot?.code || '').trim();
  if (code) return code;
  const id = String(roomId || '').trim();
  if (id.length > 12) return id.slice(0, 8) + '…';
  return id || 'Sin sala';
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} d
 * @param {number} now
 * @param {string} status
 * @param {string} transport
 * @param {number} outboxCount
 * @param {string} roomLabel
 */
export function buildFacts(d, now, status, transport, outboxCount, roomLabel) {
  return [
    { label: 'Sincronización', value: STATUS_LABELS[status] || status },
    { label: 'Internet', value: d.online === false ? 'Sin conexión' : d.online ? 'Conectado' : '—' },
    {
      label: 'Sesión Nube',
      value: d.tokenPresent ? 'Activa' : 'Sin iniciar',
    },
    {
      label: 'Sala',
      value: roomLabel,
    },
    {
      label: 'Revisión local',
      value: Number.isFinite(Number(d.revision)) ? String(d.revision) : '—',
    },
    {
      label: 'Canal activo',
      value: cloudDiagTransportLabel(transport),
    },
    {
      label: 'Cola de cambios',
      value:
        outboxCount > 0
          ? outboxCount + ' pendiente' + (outboxCount !== 1 ? 's' : '') + (formatOutboxKinds(d.outbox?.byKind) ? ' (' + formatOutboxKinds(d.outbox?.byKind) + ')' : '')
          : 'Vacía',
    },
    { label: 'Último pull', value: formatCloudDiagWhen(d.lastPullAt, now) },
    { label: 'Último push', value: formatCloudDiagWhen(d.lastPushAt, now) },
    {
      label: 'Última señal en vivo',
      value: d.lastWsSignalAt ? formatCloudDiagWhen(d.lastWsSignalAt, now) : 'Sin señales recientes',
    },
    {
      label: 'Pacientes locales',
      value: Number.isFinite(Number(d.localPatientCount)) ? String(d.localPatientCount) : '—',
    },
  ];
}

/**
 * @param {string} status
 * @param {string} transport
 * @param {Array} issues
 * @param {Array} recentErrors
 */
export function buildVerdict(status, transport, issues, recentErrors) {
  const hasError =
    issues.some(function (item) {
      return item.severity === 'error';
    }) || recentErrors.length > 0;
  const hasWarn = issues.some(function (item) {
    return item.severity === 'warn';
  });

  let level = 'ok';
  let headline = STATUS_LABELS.idle;
  let subline = 'Los cambios locales coinciden con la sala en Nube.';

  if (status === 'syncing') {
    level = 'info';
    headline = STATUS_LABELS.syncing;
    subline = 'Enviando o descargando cambios…';
  } else if (hasError) {
    level = 'error';
    headline = 'Hay problemas de sincronización';
    subline = 'Revisa las alertas más abajo.';
  } else if (hasWarn || status === 'pending') {
    level = 'warn';
    headline = status === 'pending' ? STATUS_LABELS.pending : 'Revisa la sincronización';
    subline =
      issues.find(function (item) {
        return item.severity === 'warn';
      })?.detail || 'Hay avisos que conviene revisar.';
  } else if (status === 'offline') {
    level = 'warn';
    headline = STATUS_LABELS.offline;
    subline = 'Sin contacto con el servicio de Nube.';
  } else if (status === 'idle') {
    level = 'ok';
    headline = STATUS_LABELS.idle;
    subline =
      transport === 'ws'
        ? 'Canal en vivo conectado; la cola está vacía.'
        : 'Sync por sondeo HTTP; la cola está vacía.';
  }

  return { level, headline, subline };
}

/**
 * @param {string | null | undefined} iso
 * @param {number} now
 * @param {boolean} offline
 */
function activityTileStatus(iso, now, offline) {
  if (!iso) return offline ? 'error' : 'warn';
  const t = Date.parse(String(iso));
  if (!Number.isFinite(t)) return 'warn';
  const delta = Math.max(0, now - t);
  if (delta < 120_000) return 'ok';
  return 'warn';
}

function buildLiveTileFields(d, transport, wsClose) {
  if (transport === 'offline' || d.online === false) {
    return { liveValue: 'Sin conexión', liveStatus: 'error', liveHint: 'Sin red' };
  }
  if (transport === 'ws') {
    if (wsClose.code && wsClose.code !== 1000 && wsClose.code !== 1001) {
      return { liveValue: 'Reconectando', liveStatus: 'warn', liveHint: 'Canal en vivo' };
    }
    return { liveValue: 'En vivo', liveStatus: 'ok', liveHint: 'WebSocket activo' };
  }
  return {
    liveValue: 'Sondeo HTTP',
    liveStatus: 'ok',
    liveHint: wsClose.code === 1006 ? 'En vivo en pausa' : 'Activo',
  };
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} d
 * @param {number} now
 * @param {string} transport
 * @param {{ code: number, reason: string }} wsClose
 * @param {number} outboxCount
 * @param {string} status
 * @param {Array} recentErrors
 */
export function buildTiles(d, now, transport, wsClose, outboxCount, status, recentErrors) {
  const { liveValue, liveStatus, liveHint } = buildLiveTileFields(d, transport, wsClose);
  const queueStatus = outboxCount > 0 ? (status === 'error' || recentErrors.length > 0 ? 'error' : 'warn') : 'ok';
  const offline = d.online === false;

  return [
    {
      id: 'queue',
      label: 'Cola',
      value: String(outboxCount),
      status: queueStatus,
      hint: outboxCount > 0 ? 'Pendientes' : 'Vacía',
    },
    {
      id: 'revision',
      label: 'Revisión',
      value: Number.isFinite(Number(d.revision)) ? String(d.revision) : '—',
      status: 'neutral',
      hint: 'Local',
    },
    {
      id: 'pull',
      label: 'Pull',
      value: formatCloudDiagWhen(d.lastPullAt, now),
      status: activityTileStatus(d.lastPullAt, now, offline),
      hint: 'Descarga',
    },
    {
      id: 'push',
      label: 'Push',
      value: formatCloudDiagWhen(d.lastPushAt, now),
      status: activityTileStatus(d.lastPushAt, now, offline),
      hint: 'Envío',
    },
    {
      id: 'live',
      label: 'Canal',
      value: liveValue,
      status: liveStatus,
      hint: liveHint,
    },
    {
      id: 'patients',
      label: 'Pacientes',
      value: Number.isFinite(Number(d.localPatientCount)) ? String(d.localPatientCount) : '—',
      status: 'neutral',
      hint: 'Locales',
    },
  ];
}

function baseSyncPipelineState(status) {
  if (status === 'error' || status === 'offline') return 'error';
  if (status === 'pending') return 'warn';
  if (status === 'syncing') return 'info';
  return 'ok';
}

function overrideSyncPipelineFields(d, status, recentErrors, state, detail) {
  if (recentErrors.length > 0 || d.lastCycleOk === false) {
    return { state: 'error', detail: recentErrors[0]?.explain || 'Falló el último ciclo de sync' };
  }
  if (status === 'error') {
    return { state, detail: humanizeTechnicalSyncMessage(String(d.detail || '')) || STATUS_LABELS.error };
  }
  if (d.tokenPresent && String(d.roomId || '').trim() && d.runtimeActive === false) {
    return { state: 'error', detail: 'Sync detenido' };
  }
  return { state, detail };
}

function truncateSyncPipelineDetail(detail) {
  if (/enlace con nube|cliente nube|no está listo|sync detenido/i.test(detail)) {
    return 'Sin enlace activo';
  }
  if (detail.length > 32) {
    return detail.slice(0, 29) + '…';
  }
  return detail;
}

function computeSyncPipelineFields(d, status, recentErrors) {
  const baseState = baseSyncPipelineState(status);
  const baseDetail = STATUS_LABELS[status] || status;
  const { state, detail } = overrideSyncPipelineFields(d, status, recentErrors, baseState, baseDetail);
  return { state, detail: truncateSyncPipelineDetail(detail) };
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} d
 * @param {string} status
 * @param {string} roomLabel
 * @param {Array} recentErrors
 */
export function buildPipeline(d, status, roomLabel, recentErrors) {
  const { state: syncPipelineState, detail: syncPipelineDetail } = computeSyncPipelineFields(d, status, recentErrors);

  return [
    {
      label: 'Internet',
      state: d.online === false ? 'error' : d.online ? 'ok' : 'warn',
      detail: d.online === false ? 'Sin conexión' : d.online ? 'Conectado' : '—',
    },
    {
      label: 'Sesión',
      state: d.tokenPresent ? 'ok' : 'error',
      detail: d.tokenPresent ? 'Activa' : 'Sin iniciar',
    },
    {
      label: 'Sala',
      state: String(d.roomId || '').trim() ? 'ok' : 'warn',
      detail: roomLabel,
    },
    {
      label: 'Sync',
      state: syncPipelineState,
      detail: syncPipelineDetail,
    },
  ];
}

/**
 * @param {string} status
 * @param {Array} issues
 * @param {Array} recentErrors
 */
export function buildDisplayStatusKey(status, issues, recentErrors) {
  const hasWarn = issues.some(function (item) {
    return item.severity === 'warn';
  });
  return recentErrors.length > 0 || status === 'error'
    ? 'error'
    : hasWarn || status === 'pending'
      ? 'pending'
      : status === 'syncing'
        ? 'syncing'
        : status === 'offline'
          ? 'offline'
          : 'idle';
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} d
 * @param {number} outboxCount
 */
export function buildOutboxBreakdown(d, outboxCount) {
  return Object.entries(d.outbox?.byKind || {})
    .filter(function (pair) {
      return Number(pair[1]) > 0;
    })
    .map(function (pair) {
      const kind = pair[0];
      const count = Number(pair[1]) || 0;
      return {
        kind,
        label: OUTBOX_KIND_LABELS[kind] || kind,
        count,
        share: outboxCount > 0 ? Math.round((count / outboxCount) * 100) : 0,
      };
    })
    .sort(function (a, b) {
      return b.count - a.count;
    });
}
