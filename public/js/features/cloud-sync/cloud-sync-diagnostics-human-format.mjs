/** Shared formatting/explaining primitives for Nube sync diagnostics. */

import { humanizeTechnicalSyncMessage } from './cloud-sync-error-text.mjs';

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
