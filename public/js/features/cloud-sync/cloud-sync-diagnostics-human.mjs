/** Human-readable Nube sync diagnostics — verdict, facts, and issue explanations. */

import { CLOUD_LAB_BACKFILL_MUTATION_ID } from './constants.mjs';
import {
  CLOUD_PUSH_WARN_BODY_BYTES,
} from './cloud-op-slim.mjs';
import { isToxicCloudOutboxEntry } from './cloud-sync-diagnostics.mjs';
import {
  CLOUD_SYNC_CLIENT_NOT_READY,
  humanizeTechnicalSyncMessage,
  isCloudSyncNetworkErrorMessage,
} from './cloud-sync-error-text.mjs';
import { resolveCloudErrorFixId } from './cloud-nube-fix-guides.mjs';
import { STATUS_LABELS } from './panel-conexion-html.mjs';

const WS_CLOSE_EXPLAIN = {
  1000: 'Cierre normal del canal en vivo.',
  1001: 'El servidor o la aplicación cerró el canal en vivo.',
  1006:
    'La conexión en vivo se cortó sin aviso (red intermitente, pestaña en segundo plano o el servidor cerró el socket). Se reintenta automáticamente.',
  1008: 'El servidor rechazó la conexión en vivo (token, sala o permisos inválidos).',
  1011: 'Error interno del servidor en el canal en vivo.',
  1012: 'El servidor reinició el canal en vivo.',
  1013: 'El servidor pide reintentar el canal en vivo más tarde.',
};

const ERROR_CODE_EXPLAIN = {
  revision_stale:
    'La revisión local está desactualizada. R+ hará pull y reintentará el envío.',
  conflict: 'Conflicto de versiones con la sala. Se reintenta tras actualizar.',
  quota_exceeded: 'Límite de la sala alcanzado en el servidor.',
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  unauthorized: 'Sesión no autorizada. Vuelve a iniciar sesión en Conexión.',
  invalid_token: 'Token de sesión inválido o expirado. Cierra sesión y vuelve a entrar.',
  auth_required: 'Se requiere iniciar sesión en Nube.',
  forbidden: 'No tienes permiso para esta acción en la sala.',
  not_member: 'Tu usuario no pertenece a esta sala.',
  not_found: 'Sala o recurso no encontrado en el servidor.',
  payload_too_large: 'El cambio es demasiado grande para enviar.',
  push_failed: 'No se pudo enviar el censo u operación a Nube.',
  not_implemented: 'Función no disponible en el servidor.',
  error: 'Error genérico del servidor.',
  401: 'No autorizado (401). Vuelve a iniciar sesión.',
  403: 'Acceso denegado (403). Revisa sala y permisos.',
  404: 'No encontrado (404). Revisa URL del servicio y sala.',
  409: 'Conflicto de versión (409). Se reintenta tras actualizar.',
  413: 'Payload demasiado grande (413).',
  500: 'Error del servidor (500). Reintenta en unos minutos.',
  502: 'Servidor no disponible (502).',
  503: 'Servidor saturado (503).',
};

const OP_LABELS = {
  push: 'Envío a Nube',
  pull: 'Descarga desde Nube',
  census: 'Censo',
  cycle: 'Ciclo de sync',
  unknown: 'Operación',
};

const OUTBOX_KIND_LABELS = {
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
 * @param {string | null | undefined} raw
 * @returns {{ code: number, reason: string }}
 */
export function parseWsClose(raw) {
  const text = String(raw || '').trim();
  if (!text) return { code: 0, reason: '' };
  try {
    const o = JSON.parse(text);
    return {
      code: Number(o?.code) || 0,
      reason: String(o?.reason || '').trim(),
    };
  } catch {
    return { code: 0, reason: text };
  }
}

/**
 * @param {number} code
 * @param {string} [reason]
 */
export function explainWsCloseCode(code, reason) {
  const n = Number(code) || 0;
  const base = WS_CLOSE_EXPLAIN[n] || `Código de cierre WebSocket ${n}.`;
  const extra = String(reason || '').trim();
  if (!extra) return base;
  return base + ' Motivo: ' + extra + '.';
}

/**
 * @param {string} code
 * @param {string} [fallbackMessage]
 */
export function explainCloudErrorCode(code, fallbackMessage) {
  const key = String(code || '').trim();
  const fallback = humanizeTechnicalSyncMessage(String(fallbackMessage || '').trim());
  if (key && ERROR_CODE_EXPLAIN[key]) return ERROR_CODE_EXPLAIN[key];
  if (fallback) return fallback;
  if (key) return 'Error: ' + key + '.';
  return 'Error de sincronización.';
}

/**
 * @param {{ op?: string, code?: string, message?: string }} entry
 */
export function humanizeCloudSyncError(entry) {
  const op = OP_LABELS[String(entry?.op || 'unknown')] || String(entry?.op || 'Operación');
  const explain = explainCloudErrorCode(entry?.code, entry?.message);
  return { op, explain, rawMessage: String(entry?.message || '').trim() };
}

/**
 * @param {'ws' | 'poll' | 'offline' | string} transport
 */
export function cloudDiagTransportLabel(transport) {
  if (transport === 'ws') return 'En vivo (WebSocket)';
  if (transport === 'offline') return 'Sin conexión';
  return 'Sondeo HTTP';
}

/**
 * @param {string | null | undefined} iso
 * @param {number} [nowMs]
 */
export function formatCloudDiagWhen(iso, nowMs) {
  const raw = String(iso || '').trim();
  if (!raw) return '—';
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw;
  const now = Number(nowMs) || Date.now();
  const delta = Math.max(0, now - t);
  if (delta < 45_000) return 'ahora';
  if (delta < 90_000) return 'hace 1 min';
  const mins = Math.floor(delta / 60_000);
  if (mins < 60) return 'hace ' + mins + ' min';
  const hours = Math.floor(mins / 60);
  if (hours < 48) return 'hace ' + hours + ' h';
  try {
    return new Date(t).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return raw;
  }
}

/**
 * @param {{ name?: string, sala?: string, turnKey?: string, code?: string } | null} snapshot
 * @param {string} roomId
 */
function formatRoomLabel(snapshot, roomId) {
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

function formatOutboxKinds(byKind) {
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
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} diag
 */
function isSyncFailureActive(diag) {
  const status = String(diag.status || 'unknown');
  return status === 'error' || diag.lastCycleOk === false;
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} diag
 * @param {string} transport
 * @param {{ code: number, reason: string }} wsClose
 */
function isWsCloseStillActive(diag, transport, wsClose) {
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
function isWsErrorStillActive(diag, transport) {
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
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} diag
 * @param {number} [nowMs]
 */
export function buildCloudDiagnosticsHumanView(diag, nowMs) {
  const d = diag && typeof diag === 'object' ? diag : {};
  const now = Number(nowMs) || Date.now();
  const status = String(d.status || 'unknown');
  const transport = String(d.transport || 'poll');
  const outboxCount = Number(d.outbox?.count || 0);
  const wsClose = parseWsClose(d.lastWsClose);
  const issues = [];
  const syncFailing = isSyncFailureActive(d);
  const recentErrors = syncFailing
    ? dedupeRecentErrors(
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
      )
    : [];

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

  const toxicRows = (Array.isArray(d.outbox?.entries) ? d.outbox.entries : [])
    .filter(isToxicCloudOutboxEntry)
    .sort(function (a, b) {
      return Number(b.totalBytes) - Number(a.totalBytes);
    });
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

  const facts = [
    { label: 'Sincronización', value: STATUS_LABELS[status] || status },
    { label: 'Internet', value: d.online === false ? 'Sin conexión' : d.online ? 'Conectado' : '—' },
    {
      label: 'Sesión Nube',
      value: d.tokenPresent ? 'Activa' : 'Sin iniciar',
    },
    {
      label: 'Sala',
      value: formatRoomLabel(d.roomSnapshot, String(d.roomId || '')),
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

  const roomLabel = formatRoomLabel(d.roomSnapshot, String(d.roomId || ''));

  /**
   * @param {string | null | undefined} iso
   */
  function activityTileStatus(iso) {
    if (!iso) return d.online === false ? 'error' : 'warn';
    const t = Date.parse(String(iso));
    if (!Number.isFinite(t)) return 'warn';
    const delta = Math.max(0, now - t);
    if (delta < 120_000) return 'ok';
    if (delta < 900_000) return 'warn';
    return 'warn';
  }

  let liveValue = '—';
  let liveStatus = 'neutral';
  let liveHint = '';
  if (transport === 'offline' || d.online === false) {
    liveValue = 'Sin conexión';
    liveStatus = 'error';
    liveHint = 'Sin red';
  } else if (transport === 'ws') {
    if (wsClose.code && wsClose.code !== 1000 && wsClose.code !== 1001) {
      liveValue = 'Reconectando';
      liveStatus = 'warn';
      liveHint = 'Canal en vivo';
    } else {
      liveValue = 'En vivo';
      liveStatus = 'ok';
      liveHint = 'WebSocket activo';
    }
  } else {
    liveValue = 'Sondeo HTTP';
    liveStatus = wsClose.code === 1006 ? 'ok' : 'ok';
    liveHint = wsClose.code === 1006 ? 'En vivo en pausa' : 'Activo';
  }

  const queueStatus = outboxCount > 0 ? (status === 'error' || recentErrors.length > 0 ? 'error' : 'warn') : 'ok';

  let syncPipelineState =
    status === 'error' ? 'error' : status === 'offline' ? 'error' : status === 'pending' ? 'warn' : status === 'syncing' ? 'info' : 'ok';
  let syncPipelineDetail = STATUS_LABELS[status] || status;
  if (recentErrors.length > 0 || d.lastCycleOk === false) {
    syncPipelineState = 'error';
    syncPipelineDetail = recentErrors[0]?.explain || 'Falló el último ciclo de sync';
  } else if (status === 'error') {
    syncPipelineDetail = humanizeTechnicalSyncMessage(String(d.detail || '')) || STATUS_LABELS.error;
  } else if (d.tokenPresent && String(d.roomId || '').trim() && d.runtimeActive === false) {
    syncPipelineState = 'error';
    syncPipelineDetail = 'Sync detenido';
  }

  if (/enlace con nube|cliente nube|no está listo|sync detenido/i.test(syncPipelineDetail)) {
    syncPipelineDetail = 'Sin enlace activo';
  } else if (syncPipelineDetail.length > 32) {
    syncPipelineDetail = syncPipelineDetail.slice(0, 29) + '…';
  }

  const displayStatusKey =
    recentErrors.length > 0 || status === 'error'
      ? 'error'
      : hasWarn || status === 'pending'
        ? 'pending'
        : status === 'syncing'
          ? 'syncing'
          : status === 'offline'
            ? 'offline'
            : 'idle';

  const pipeline = [
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

  const tiles = [
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
      status: activityTileStatus(d.lastPullAt),
      hint: 'Descarga',
    },
    {
      id: 'push',
      label: 'Push',
      value: formatCloudDiagWhen(d.lastPushAt, now),
      status: activityTileStatus(d.lastPushAt),
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

  const outboxBreakdown = Object.entries(d.outbox?.byKind || {})
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

  return {
    verdict: { level, headline, subline },
    statusKey: status,
    displayStatusKey,
    roomLabel,
    facts,
    tiles,
    pipeline,
    outboxBreakdown,
    toxicOutbox: toxicRows.slice(0, 3).map(function (row) {
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
    }),
    issues,
    recentErrors,
  };
}
