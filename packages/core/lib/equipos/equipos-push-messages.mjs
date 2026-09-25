/** Spanish push copy for equipos waitlist — shared LAN + cloud. */

import { EQUIPOS_ICON_192 } from './equipos-icon-paths.mjs';
import { EQUIPOS_PWA_LAN_URL } from './equipos-pwa-urls.mjs';

export const DEVICE_LABELS = {
  lumify: 'Lumify',
  ekg: 'EKG',
  ultrasound: 'Ultrasonido',
};

function pushEnvelope(title, body, tag, data) {
  return {
    title,
    body,
    icon: EQUIPOS_ICON_192,
    badge: EQUIPOS_ICON_192,
    tag,
    data,
  };
}

function buildLumifyReturnPayload(ctx, label, tag, data) {
  const pct = ctx.chargePct != null ? `${ctx.chargePct}%` : '—';
  const title = `${label} libre`;
  const body = ctx.isNext ? `Batería: ${pct}` : `Posición ${ctx.position ?? 2} · Batería: ${pct}`;
  return pushEnvelope(title, body, tag, { ...data, chargePct: ctx.chargePct });
}

function buildDeviceAvailablePayload(ctx, label, tag, data) {
  const title = ctx.isNext ? `${label} disponible` : `${label} liberado`;
  const body = ctx.isNext
    ? 'Eres el siguiente en la cola. Puedes tomarlo ahora.'
    : `El dispositivo está libre. Tu posición: ${ctx.position ?? '—'}.`;
  return pushEnvelope(title, body, tag, data);
}

function buildReportPayload(ctx, label, tag, data, kind) {
  const isMalfunction = kind === 'malfunction';
  const title = isMalfunction ? `Falla — ${label}` : `Material faltante — ${label}`;
  const fallback = isMalfunction
    ? 'Se reportó una falla del dispositivo. Revisa el tablero.'
    : 'Falta material en el dispositivo. Revisa el tablero.';
  const body = ctx.message ? `Reporte en cola: ${ctx.message}` : fallback;
  return pushEnvelope(title, body, tag, data);
}

function buildWaitlistNextPayload(label, deviceType, data) {
  return pushEnvelope(
    `Eres el siguiente — ${label}`,
    'Alguien cedió el turno. Te avisaremos cuando el dispositivo esté libre.',
    `equipos-${deviceType}-waitlist_next`,
    data
  );
}

function buildQueueBypassPayload(ctx, label, deviceType, data) {
  const who = ctx.takerName
    ? `${ctx.takerName} (${ctx.takerRotation || '—'})`
    : 'Otro equipo';
  return pushEnvelope(
    `${label} — fuera de turno`,
    `${who} tomó el dispositivo sin ser el siguiente en la cola.`,
    `equipos-${deviceType}-queue_bypass`,
    data
  );
}

/**
 * @param {'device_available'|'lumify_return'|'malfunction'|'missing_material'|'waitlist_next'|'queue_bypass'} kind
 * @param {object} ctx
 * @param {string} ctx.deviceType
 * @param {number} [ctx.position]
 * @param {boolean} [ctx.isNext]
 * @param {number|null} [ctx.chargePct]
 * @param {string} [ctx.message]
 * @param {string} [ctx.takerName]
 * @param {string} [ctx.takerRotation]
 * @param {string} [ctx.appUrl] PWA start URL for notification click-through
 */
export function buildEquiposPushPayload(kind, ctx) {
  const label = DEVICE_LABELS[ctx.deviceType] || ctx.deviceType;
  const tag = `equipos-${ctx.deviceType}-${kind}`;
  const appUrl = ctx.appUrl || EQUIPOS_PWA_LAN_URL;
  const data = { deviceType: ctx.deviceType, kind, url: appUrl };

  if (kind === 'lumify_return') return buildLumifyReturnPayload(ctx, label, tag, data);
  if (kind === 'device_available') return buildDeviceAvailablePayload(ctx, label, tag, data);
  if (kind === 'malfunction') return buildReportPayload(ctx, label, tag, data, kind);
  if (kind === 'missing_material') return buildReportPayload(ctx, label, tag, data, kind);
  if (kind === 'waitlist_next') return buildWaitlistNextPayload(label, ctx.deviceType, data);
  if (kind === 'queue_bypass') return buildQueueBypassPayload(ctx, label, ctx.deviceType, data);

  return pushEnvelope(label, 'Actualización de cola.', tag, data);
}
