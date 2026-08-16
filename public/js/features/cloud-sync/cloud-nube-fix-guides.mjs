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
      'Si la cola es solo labs y ya están en Nube, usa Descartar labs en cola.',
      'Si no baja el número de la cola, toca Forzar sync.',
      'Revisa las alertas de error: pueden bloquear el envío.',
    ],
  },
  outbox_labs_stuck: {
    id: 'outbox_labs_stuck',
    title: 'Labs atorados en cola',
    summary:
      'Los laboratorios ya parseados no deberían re-subirse si Nube ya los tiene. Puedes vaciar solo labs sin tocar censo ni signos.',
    steps: [
      'Toca Forzar sync una vez (pull actualiza el índice de labs en servidor).',
      'Si la cola sigue con labs, toca Descartar labs en cola.',
      'Los labs siguen en tu Mac; solo se descarta el envío pendiente.',
      'Labs nuevos o re-parseados con cambios reales se volverán a encolar solos.',
    ],
  },
  toxic_legacy_lab_backfill: {
    id: 'toxic_legacy_lab_backfill',
    title: 'Labs en un solo push (R+ antiguo)',
    summary:
      'Un cliente está intentando enviar muchos labs en un solo lote (`cloud-lab-backfill`). Eso satura el servidor y bloquea la sala.',
    steps: [
      'Actualiza R+ en esta Mac (versión 8.0.8+ con fix de labs por paciente).',
      'Reinicia R+ y abre Diagnóstico Nube → Reintentar cola (divide el lote).',
      'Si otro Mac o iPad en la misma sala usa R+ viejo, actualízalo también.',
      'Si los labs ya están en Nube: Descartar labs en cola.',
      'Copia el informe técnico si soporte debe revisar quién empuja el lote.',
    ],
  },
  toxic_outbox_chunk: {
    id: 'toxic_outbox_chunk',
    title: 'Lote demasiado grande en cola',
    summary: 'Hay un push local que excede el tamaño que el servidor acepta (~200 KB por lote).',
    steps: [
      'Revisa «Lotes pesados en cola» en este panel: anota el path más grande.',
      'Toca Reintentar cola (R+ actual divide o recorta el lote).',
      'Si es solo labs y ya están en Nube: Descartar labs en cola.',
      'Si el path es un lab con PDF o texto SOME crudo, re-parsea localmente sin re-subir el blob.',
      'Si la cola se vacía pero siguen 503, otro dispositivo en la sala puede estar empujando — actualiza todos los R+ de la guardia.',
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

/** @param {string} code @param {string} explain */
function matchRevisionStaleFixId(code, explain) {
  if (code === 'revision_stale' || explain.includes('desactualizada')) return 'revision_stale';
  return null;
}

/** @param {string} code */
function matchInvalidTokenFixId(code) {
  if (code === 'invalid_token' || code === 'unauthorized' || code === '401' || code === '403') {
    return 'invalid_token';
  }
  return null;
}

/** @param {string} explain */
function matchSyncClientNotReadyFixId(explain) {
  if (/enlace con nube|cliente nube|no está listo|no configurado/i.test(explain)) {
    return 'sync_client_not_ready';
  }
  return null;
}

/** @param {{ op?: string }} entry */
function matchOpFixId(entry) {
  const op = String(entry?.op || '').toLowerCase();
  if (op.includes('envío') || entry?.op === 'push') return 'push_failed';
  if (op.includes('descarga') || entry?.op === 'pull') return 'pull_failed';
  if (entry?.op === 'cycle') return 'cycle_failed';
  return null;
}

/**
 * @param {{ op?: string, code?: string, message?: string, explain?: string }} entry
 */
export function resolveCloudErrorFixId(entry) {
  const code = String(entry?.code || '').trim();
  const explain = String(entry?.explain || entry?.message || '').toLowerCase();
  return (
    matchRevisionStaleFixId(code, explain) ||
    matchInvalidTokenFixId(code) ||
    matchSyncClientNotReadyFixId(explain) ||
    matchOpFixId(entry) ||
    'generic_sync_error'
  );
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
