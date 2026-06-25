/** Spanish push copy for equipos waitlist — shared LAN + cloud. */

import { EQUIPOS_ICON_192 } from './equipos-icon-paths.mjs';

export const DEVICE_LABELS = {
  lumify: 'Lumify',
  ekg: 'EKG',
  ultrasound: 'Ultrasonido',
};

/**
 * @param {'device_available'|'lumify_return'|'malfunction'|'missing_material'} kind
 * @param {object} ctx
 * @param {string} ctx.deviceType
 * @param {number} [ctx.position]
 * @param {boolean} [ctx.isNext]
 * @param {number|null} [ctx.chargePct]
 * @param {string} [ctx.message]
 */
export function buildEquiposPushPayload(kind, ctx) {
  const label = DEVICE_LABELS[ctx.deviceType] || ctx.deviceType;
  const icon = EQUIPOS_ICON_192;
  const badge = EQUIPOS_ICON_192;
  const tag = `equipos-${ctx.deviceType}-${kind}`;
  const data = { deviceType: ctx.deviceType, kind, url: '/equipos' };

  if (kind === 'lumify_return') {
    const pct = ctx.chargePct != null ? `${ctx.chargePct}%` : '—';
    const title = ctx.isNext ? `${label} disponible — eres el siguiente` : `${label} devuelto`;
    const body = ctx.isNext
      ? `Carga de tablet: ${pct}. Puedes tomarlo ahora.`
      : `Carga de tablet: ${pct}. Revisa tu posición en la cola.`;
    return { title, body, icon, badge, tag, data: { ...data, chargePct: ctx.chargePct } };
  }

  if (kind === 'device_available') {
    const title = ctx.isNext ? `${label} disponible` : `${label} liberado`;
    const body = ctx.isNext
      ? 'Eres el siguiente en la cola. Puedes tomarlo ahora.'
      : `El dispositivo está libre. Tu posición: ${ctx.position ?? '—'}.`;
    return { title, body, icon, badge, tag, data };
  }

  if (kind === 'malfunction') {
    return {
      title: `Falla — ${label}`,
      body: ctx.message
        ? `Reporte en cola: ${ctx.message}`
        : 'Se reportó una falla del dispositivo. Revisa el tablero.',
      icon,
      badge,
      tag,
      data,
    };
  }

  if (kind === 'missing_material') {
    return {
      title: `Material faltante — ${label}`,
      body: ctx.message
        ? `Reporte en cola: ${ctx.message}`
        : 'Falta material en el dispositivo. Revisa el tablero.',
      icon,
      badge,
      tag,
      data,
    };
  }

  return { title: label, body: 'Actualización de cola.', icon, badge, tag, data };
}
