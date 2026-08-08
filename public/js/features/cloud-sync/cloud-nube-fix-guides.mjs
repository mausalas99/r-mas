/** Fix guides for Diagnóstico Nube — tap an alert to open steps. */

import { esc } from '../../dom-escape.mjs';
import { STACKED_BACKDROP_CLASS } from './stacked-overlay.mjs';

/** @typedef {{ id: string, title: string, summary: string, steps: string[] }} CloudNubeFixGuide */

/** @type {Record<string, CloudNubeFixGuide>} */
const FIX_GUIDES = {
  no_internet: {
    id: 'no_internet',
    title: 'Sin internet',
    summary: 'R+ guarda los cambios en tu Mac hasta recuperar red.',
    steps: [
      'Revisa Wi‑Fi o cable en la Mac de guardia.',
      'Si usas VPN hospitalaria, confirma que está conectada.',
      'Cuando vuelva la red, abre Diagnóstico Nube y toca Forzar sync.',
    ],
  },
  cloud_not_active: {
    id: 'cloud_not_active',
    title: 'Nube no activa',
    summary: 'Esta guardia no está usando sincronización con Nube.',
    steps: [
      'Confirma en Mi rotación que la sala es una sala Nube (no solo local).',
      'Si acabas de cambiar de guardia, completa la configuración de rotación.',
      'Vuelve a Conexión y verifica que el chip de Nube no diga offline.',
    ],
  },
  no_session: {
    id: 'no_session',
    title: 'Sin sesión en Nube',
    summary: 'Hace falta iniciar sesión para sincronizar con la sala.',
    steps: [
      'Ve a Conexión → inicia sesión con tu usuario Nube.',
      'Si no tienes cuenta, regístrate o pide acceso al admin de la sala.',
      'Tras entrar, confirma que ves tu nombre y la sala en Conexión.',
    ],
  },
  no_room: {
    id: 'no_room',
    title: 'Sin sala configurada',
    summary: 'R+ necesita saber en qué sala de guardia sincronizar.',
    steps: [
      'Abre Conexión y selecciona o crea la sala del turno.',
      'En Mi rotación, confirma equipo y sala asignados.',
      'Vuelve a Diagnóstico Nube y revisa que la cadena muestre tu sala en verde.',
    ],
  },
  bridge_not_configured: {
    id: 'bridge_not_configured',
    title: 'Sync local no enlazado',
    summary: 'Los cambios clínicos no están llegando al motor de Nube.',
    steps: [
      'Cierra y vuelve a abrir R+ (o reinicia la app).',
      'Abre Conexión y espera 10–15 s tras ver tu sala.',
      'Si persiste, cierra sesión en Conexión y vuelve a entrar.',
    ],
  },
  sync_not_active: {
    id: 'sync_not_active',
    title: 'Sync no está activo',
    summary: 'Tienes sesión y sala, pero el motor de sync no arrancó.',
    steps: [
      'En Conexión, confirma que ves la sala y el chip de estado de Nube.',
      'Vuelve aquí y toca Forzar sync.',
      'Si sigue fallando: Conexión → Cerrar sesión → entra de nuevo.',
      'Como último recurso, reinicia R+ con la Mac conectada a red.',
    ],
  },
  outbox_pending: {
    id: 'outbox_pending',
    title: 'Cambios pendientes en cola',
    summary: 'Hay mutaciones locales que aún no llegaron al servidor.',
    steps: [
      'Confirma que hay internet y sesión activa en Conexión.',
      'Toca Reintentar cola en este panel.',
      'Si no baja el número de la cola, toca Forzar sync.',
      'Revisa las alertas de error: pueden bloquear el envío.',
    ],
  },
  sync_error: {
    id: 'sync_error',
    title: 'Error de sincronización',
    summary: 'El último ciclo de sync reportó un problema.',
    steps: [
      'Lee la alerta con el detalle del error (toca para ver pasos específicos).',
      'Toca Forzar sync una vez.',
      'Si el error se repite, copia el informe técnico y contacta soporte.',
    ],
  },
  cloud_offline: {
    id: 'cloud_offline',
    title: 'Sin conexión a Nube',
    summary: 'No se puede contactar el servicio de sync en la nube.',
    steps: [
      'Revisa internet en la Mac.',
      'En Conexión → Avanzado, confirma que la URL del servicio es correcta.',
      'Si el hospital bloquea workers.dev, avisa a soporte TI.',
      'Reintenta con Forzar sync cuando la red responda.',
    ],
  },
  cycle_failed: {
    id: 'cycle_failed',
    title: 'Ciclo de sync falló',
    summary: 'El intento automático de sincronizar no terminó bien.',
    steps: [
      'Toca Forzar sync en este panel.',
      'Si hay cola pendiente, usa también Reintentar cola.',
      'Abre la alerta de error más reciente para ver la causa.',
    ],
  },
  ws_error: {
    id: 'ws_error',
    title: 'Error en canal en vivo',
    summary: 'Las notificaciones instantáneas fallaron; el sondeo HTTP puede seguir activo.',
    steps: [
      'Normal si la red es intermitente — espera 1–2 minutos.',
      'Toca Forzar sync para confirmar que pull/push responden.',
      'Si persiste, reinicia R+ o cierra sesión y vuelve a entrar.',
    ],
  },
  ws_close: {
    id: 'ws_close',
    title: 'Canal en vivo interrumpido',
    summary: 'La conexión WebSocket se cortó; R+ reintenta y usa sondeo HTTP.',
    steps: [
      'No es grave si Cola está vacía y Pull/Push dicen «ahora» o «hace X min».',
      'Evita cerrar R+ en segundo plano por largos periodos en guardia.',
      'Si el sync se detiene, toca Forzar sync.',
    ],
  },
  sync_client_not_ready: {
    id: 'sync_client_not_ready',
    title: 'Cliente de Nube no listo',
    summary: 'El enlace interno con el servidor de sync no se completó.',
    steps: [
      'Ve a Conexión y confirma sala + equipo visibles.',
      'Espera 10 s y vuelve a Diagnóstico Nube.',
      'Toca Forzar sync.',
      'Si persiste: Cerrar sesión → volver a entrar → reiniciar R+ si hace falta.',
    ],
  },
  revision_stale: {
    id: 'revision_stale',
    title: 'Revisión desactualizada',
    summary: 'Tu copia local quedó detrás de la sala; R+ debería reintentar solo.',
    steps: [
      'Toca Forzar sync (hace pull y reintenta el envío).',
      'No edites el mismo paciente en dos Macs al mismo tiempo.',
      'Si se repite en bucle, cierra sesión y vuelve a entrar.',
    ],
  },
  push_failed: {
    id: 'push_failed',
    title: 'Envío a Nube falló',
    summary: 'Un cambio local no se pudo subir al servidor.',
    steps: [
      'Toca Reintentar cola.',
      'Revisa internet y que la sesión siga activa en Conexión.',
      'Toca Forzar sync.',
      'Si hay código de error en la alerta, ábrela para más detalle.',
    ],
  },
  pull_failed: {
    id: 'pull_failed',
    title: 'Descarga desde Nube falló',
    summary: 'No se pudieron traer cambios del servidor.',
    steps: [
      'Revisa internet y VPN.',
      'Toca Forzar sync.',
      'Confirma en Conexión que la sala es la del turno actual.',
    ],
  },
  invalid_token: {
    id: 'invalid_token',
    title: 'Sesión expirada o inválida',
    summary: 'El token de Nube ya no es válido.',
    steps: [
      'Conexión → Cerrar sesión.',
      'Vuelve a iniciar sesión con tu usuario.',
      'Confirma sala y equipo; luego Forzar sync.',
    ],
  },
  generic_sync_error: {
    id: 'generic_sync_error',
    title: 'Error de sincronización',
    summary: 'Ocurrió un error al sincronizar con Nube.',
    steps: [
      'Toca Forzar sync.',
      'Si hay cola, Reintentar cola.',
      'Cierra sesión y vuelve a entrar si el error se repite.',
      'Copia el informe técnico para soporte si sigue fallando.',
    ],
  },
};

/**
 * @param {string} id
 * @returns {CloudNubeFixGuide | null}
 */
export function getCloudNubeFixGuide(id) {
  const key = String(id || '').trim();
  return FIX_GUIDES[key] || null;
}

/**
 * @param {{ op?: string, code?: string, message?: string, explain?: string }} entry
 */
export function resolveCloudErrorFixId(entry) {
  const code = String(entry?.code || '').trim();
  const explain = String(entry?.explain || entry?.message || '').toLowerCase();
  if (code === 'revision_stale' || explain.includes('desactualizada')) return 'revision_stale';
  if (code === 'invalid_token' || code === 'unauthorized' || code === '401' || code === '403') {
    return 'invalid_token';
  }
  if (/enlace con nube|cliente nube|no está listo|no configurado/i.test(explain)) {
    return 'sync_client_not_ready';
  }
  const op = String(entry?.op || '').toLowerCase();
  if (op.includes('envío') || entry?.op === 'push') return 'push_failed';
  if (op.includes('descarga') || entry?.op === 'pull') return 'pull_failed';
  if (entry?.op === 'cycle') return 'cycle_failed';
  return 'generic_sync_error';
}

/**
 * @param {CloudNubeFixGuide} guide
 */
export function cloudNubeFixModalMarkup(guide) {
  let stepsHtml = '';
  guide.steps.forEach(function (step) {
    stepsHtml += '<li class="cloud-nube-fix-step">' + esc(step) + '</li>';
  });
  return (
    '<div class="' +
    STACKED_BACKDROP_CLASS +
    '" data-cloud-nube-fix-modal>' +
    '<div class="lab-conflict-modal cloud-nube-fix-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-nube-fix-title">' +
    '<h3 id="cloud-nube-fix-title" class="cloud-nube-fix-title">' +
    esc(guide.title) +
    '</h3>' +
    '<p class="cloud-nube-fix-summary">' +
    esc(guide.summary) +
    '</p>' +
    '<ol class="cloud-nube-fix-steps">' +
    stepsHtml +
    '</ol>' +
    '<div class="cloud-nube-fix-actions">' +
    '<button type="button" class="cloud-sync-btn" data-cloud-nube-fix-close>Cerrar</button>' +
    '</div></div></div>'
  );
}

/**
 * @param {string} fixId
 */
export function showCloudNubeFixModal(fixId) {
  const guide = getCloudNubeFixGuide(fixId) || getCloudNubeFixGuide('generic_sync_error');
  if (!guide) return;

  const host = document.createElement('div');
  host.innerHTML = cloudNubeFixModalMarkup(guide);
  const overlay = host.firstElementChild;
  if (!overlay || !(overlay instanceof HTMLElement)) return;

  function close() {
    overlay.remove();
  }

  overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay) close();
  });
  const closeBtn = overlay.querySelector('[data-cloud-nube-fix-close]');
  if (closeBtn) closeBtn.addEventListener('click', close);

  document.body.appendChild(overlay);
  if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();
}
