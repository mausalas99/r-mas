import {
  conflictSnapshotsMatchForAutoResolve,
  pickDiffKeys,
  summarizeConflictFieldValue,
  formatFieldLabel,
} from '../lan-conflict-silent-match.mjs';

export { conflictSnapshotsMatchForAutoResolve, pickDiffKeys, summarizeConflictFieldValue, formatFieldLabel };

const BACKDROP_ID = 'clinical-conflict-backdrop';

const ENTITY_LABELS = {
  historiaClinica: 'Historia clínica',
  patient: 'Datos del paciente',
  todo: 'Pendiente',
  agenda: 'Evento de agenda',
  roomBundle: 'Sala (agenda y pendientes)',
};

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatConflictValue(value, fieldKey) {
  return summarizeConflictFieldValue(fieldKey, value);
}

/**
 * @param {{
 *   entityType?: string,
 *   entityId?: string,
 *   patientId?: string,
 *   transport?: string,
 *   localVersion?: number,
 *   serverVersion?: number,
 * }} context
 * @returns {string}
 */
export function buildConflictModalTitle(context) {
  const ctx = context || {};
  if (ctx.entityType === 'roomBundle') return 'Conflicto de paquete de sala';
  if (ctx.entityType === 'todo') return 'Pendiente en la sala';
  if (ctx.entityType === 'historiaClinica') return 'Historia clínica en la sala';
  if (ctx.entityType === 'patient') return 'Paciente en la sala';
  return 'Cambio en la sala';
}

function buildConflictActionCopy(context) {
  const ctx = context || {};
  if (ctx.intent === 'todo-delete') {
    return {
      primaryTitle: 'No eliminar — conservar sala',
      primaryHint:
        'El pendiente sigue en la sala para todos. En tu pantalla volverá a aparecer si ya lo habías quitado.',
      secondaryTitle: 'Sí eliminar — reenviar borrado',
      secondaryHint:
        'Intenta de nuevo el borrado con la versión actual de la sala. Úsalo si estás seguro de que debe desaparecer.',
      tagline: 'Conflicto al eliminar un pendiente en la sala.',
    };
  }
  if (ctx.intent === 'todo-complete') {
    return {
      primaryTitle: 'Marcar como en la sala',
      primaryHint: 'Aplica el estado completado que ya tiene el host (si aplica).',
      secondaryTitle: 'Dejar como lo tengo',
      secondaryHint: 'Cierra sin cambiar; revisa el pendiente en tu lista.',
      tagline: 'El pendiente ya estaba completado o se marcó en otro equipo.',
    };
  }
  if (ctx.entityType === 'todo') {
    return {
      primaryTitle: 'Usar lo que tiene la sala',
      primaryHint: 'Aplica el texto y estado del pendiente tal como está guardado en el host.',
      secondaryTitle: 'Mantener mi cambio local',
      secondaryHint: 'Cierra el comparador sin sobrescribir; revisa el texto en pantalla.',
      tagline: 'El mismo pendiente cambió en otro equipo.',
    };
  }
  if (ctx.entityType === 'roomBundle') {
    return {
      primaryTitle: 'Usar versión del servidor',
      primaryHint:
        'Carga el censo, agenda y pendientes que ya tiene la sala. Tu intento local queda como borrador.',
      secondaryTitle: 'Cerrar sin decidir',
      secondaryHint: 'El borrador queda en ⇄ → Borradores de conflicto para revisarlo después.',
      tagline: 'La sala tiene otra versión del paquete de sincronización.',
    };
  }
  return {
    primaryTitle: 'Usar versión del servidor',
    primaryHint:
      'Descarta este intento de guardado y carga lo que ya guardó la sala o el host. Se elimina el borrador guardado.',
    secondaryTitle: 'Seguir con mi borrador',
    secondaryHint:
      'Cierra el comparador y mantén tus cambios en pantalla. El borrador queda en Ajustes → LAN.',
    tagline: 'Otro equipo guardó antes. Elige la copia de la sala o sigue con lo que tienes en pantalla.',
  };
}

export function buildConflictContextHtml(context) {
  const ctx = context || {};
  const entityLabel = ENTITY_LABELS[ctx.entityType] || formatFieldLabel(ctx.entityType) || 'Registro clínico';
  const patientName = ctx.patientDisplayName ? String(ctx.patientDisplayName) : '';
  const patientRef = patientName
    ? 'Paciente: ' + escHtml(patientName)
    : ctx.patientId
      ? 'Paciente (id interno)'
      : '';

  let lead = entityLabel;
  if (ctx.entityType === 'todo' && ctx.itemPreview) {
    lead = 'Pendiente: «' + escHtml(ctx.itemPreview) + '»';
  }

  let cause =
    'Otro guardado llegó antes que el tuyo y ambos tocaron los mismos campos.';
  if (ctx.intent === 'todo-delete') {
    cause =
      'Quisiste eliminar este pendiente, pero la sala tiene una versión distinta (otro equipo lo editó o tu copia local estaba desactualizada).';
  } else if (ctx.transport === 'ws') {
    cause =
      'La sala LAN recibió un cambio en vivo (otro equipo conectado) mientras tú editabas o guardabas.';
  } else if (ctx.transport === 'http') {
    cause =
      'El host de la sala ya tenía una versión más reciente cuando intentaste guardar por red.';
  }

  const localV = ctx.localVersion != null && ctx.localVersion !== '' ? Number(ctx.localVersion) : null;
  const serverV = ctx.serverVersion != null && ctx.serverVersion !== '' ? Number(ctx.serverVersion) : null;
  let versionHtml = '';
  if (localV != null || serverV != null) {
    const localBadge =
      localV != null && Number.isFinite(localV)
        ? '<span class="clinical-conflict-version-pill clinical-conflict-version-pill--local">Tu base: v' +
          escHtml(localV) +
          '</span>'
        : '';
    const serverBadge =
      serverV != null && Number.isFinite(serverV)
        ? '<span class="clinical-conflict-version-pill clinical-conflict-version-pill--server">Sala: v' +
          escHtml(serverV) +
          '</span>'
        : '';
    versionHtml =
      '<div class="clinical-conflict-versions">' +
      localBadge +
      serverBadge +
      (localV != null && serverV != null && localV !== serverV
        ? '<span class="clinical-conflict-version-note">El número de versión confirma que no partiste del mismo estado.</span>'
        : '') +
      '</div>';
  }

  const showLead = ctx.entityType !== 'historiaClinica' || !patientRef;
  return (
    '<div class="clinical-conflict-context">' +
    (showLead ? '<p class="clinical-conflict-context-lead"><strong>' + lead + '</strong></p>' : '') +
    (patientRef ? '<p class="clinical-conflict-context-patient">' + patientRef + '</p>' : '') +
    '<p class="clinical-conflict-context-body">' +
    escHtml(cause) +
    '</p>' +
    versionHtml +
    '</div>'
  );
}

export function buildConflictDiffParts({ conflictingKeys, localData, serverData }) {
  const conflictSet = new Set(conflictingKeys || []);
  const keys = pickDiffKeys(conflictingKeys, localData, serverData);

  if (!keys.length) {
    return {
      keyCount: 0,
      summaryHtml:
        '<p class="clinical-conflict-summary-empty">No hay detalle por sección (común al eliminar o por desfase de versión). Elige abajo si conservas la sala o tu borrador.</p>',
      detailHtml: '',
    };
  }

  const labels = keys.map((key) => formatFieldLabel(key));
  const conflictOnly = keys.filter((key) => conflictSet.has(key) || conflictSet.has('*'));
  const summaryLead =
    conflictOnly.length === keys.length
      ? keys.length === 1
        ? 'Chocó <strong>1 sección</strong>:'
        : 'Chocaron <strong>' + keys.length + ' secciones</strong>:'
      : 'Hay <strong>' + keys.length + ' diferencia' + (keys.length === 1 ? '' : 's') + '</strong> respecto a la sala:';

  const summaryHtml =
    '<div class="clinical-conflict-summary">' +
    '<p class="clinical-conflict-summary-lead">' +
    summaryLead +
    '</p>' +
    '<ul class="clinical-conflict-affected">' +
    labels.map((label) => '<li>' + escHtml(label) + '</li>').join('') +
    '</ul></div>';

  const cards = keys
    .map((key) => {
      const isConflict = conflictSet.has(key) || conflictSet.has('*');
      const localVal = formatConflictValue(localData?.[key], key);
      const serverVal = formatConflictValue(serverData?.[key], key);
      const serverMissing = serverData?.[key] === undefined || serverData?.[key] === null;
      const samePreview = localVal === serverVal && localVal !== '—';
      return (
        '<article class="clinical-conflict-field-card' +
        (isConflict ? ' clinical-conflict-field-card--hot' : '') +
        '">' +
        '<h4 class="clinical-conflict-field-title">' +
        escHtml(formatFieldLabel(key)) +
        '</h4>' +
        (samePreview
          ? '<p class="clinical-conflict-field-same">En este resumen se ve igual en tu borrador y en la sala; aun así el registro del host no coincide del todo (versión, metadatos u otro campo que aquí no mostramos).</p>'
          : '<div class="clinical-conflict-compare">' +
            '<div class="clinical-conflict-side clinical-conflict-side--local">' +
            '<span class="clinical-conflict-side-label">Tu intento</span>' +
            '<p>' +
            escHtml(localVal) +
            '</p></div>' +
            '<div class="clinical-conflict-side clinical-conflict-side--server' +
            (serverMissing ? ' clinical-conflict-side--missing' : '') +
            '">' +
            '<span class="clinical-conflict-side-label">En la sala</span>' +
            '<p>' +
            escHtml(serverVal) +
            '</p></div></div>') +
        '</article>'
      );
    })
    .join('');

  return {
    keyCount: keys.length,
    summaryHtml,
    detailHtml: '<div class="clinical-conflict-diff-cards">' + cards + '</div>',
  };
}

/**
 * @param {{ conflictingKeys?: string[], localData?: Record<string, unknown>, serverData?: Record<string, unknown> }} opts
 * @returns {string}
 */
export function buildConflictDiffHtml(opts) {
  const parts = buildConflictDiffParts(opts);
  return parts.summaryHtml + parts.detailHtml;
}

function closeClinicalConflictViewer() {
  if (typeof document === 'undefined') return;
  const prev = document.getElementById(BACKDROP_ID);
  if (prev) prev.remove();
}

/**
 * @param {{
 *   draftId?: string,
 *   conflictingKeys?: string[],
 *   localData?: Record<string, unknown>,
 *   serverData?: Record<string, unknown>,
 *   context?: object,
 *   onUseServer?: () => void,
 *   onEditDraft?: () => void,
 *   onClose?: () => void,
 * }} opts
 */
export function openClinicalConflictViewer(opts) {
  if (typeof document === 'undefined') return;
  const {
    draftId,
    conflictingKeys,
    localData,
    serverData,
    context,
    onUseServer,
    onEditDraft,
    onClose,
  } = opts || {};

  closeClinicalConflictViewer();

  const contextHtml = buildConflictContextHtml(context);
  const actions = buildConflictActionCopy(context);
  const modalTitle = buildConflictModalTitle(context);
  const isRoomBundle = context && context.entityType === 'roomBundle';
  const diffParts = isRoomBundle
    ? {
        keyCount: 1,
        summaryHtml:
          '<p class="clinical-conflict-summary-empty">El host rechazó tu paquete de sala (revisión distinta). Usa la versión del servidor o cierra y resuelve después desde ⇄.</p>',
        detailHtml: '',
      }
    : buildConflictDiffParts({ conflictingKeys, localData, serverData });
  const detailBlock = diffParts.detailHtml
    ? '<details class="clinical-conflict-details">' +
      '<summary>Ver comparación por sección</summary>' +
      '<div class="clinical-conflict-diff-wrap">' +
      diffParts.detailHtml +
      '</div></details>'
    : '';
  const backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop clinical-conflict-backdrop';
  backdrop.id = BACKDROP_ID;
  if (draftId) backdrop.dataset.draftId = String(draftId);

  backdrop.innerHTML =
    '<div class="lab-conflict-modal clinical-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="clinical-conflict-title">' +
    '<header class="clinical-conflict-header clinical-conflict-header--plain">' +
    '<div class="clinical-conflict-header-text">' +
    '<h3 id="clinical-conflict-title">' +
    escHtml(modalTitle) +
    '</h3>' +
    '<p class="clinical-conflict-tagline">' +
    escHtml(actions.tagline) +
    '</p>' +
    '</div></header>' +
    contextHtml +
    diffParts.summaryHtml +
    '<div class="lab-conflict-actions clinical-conflict-actions">' +
    '<button type="button" class="btn-conflict-primary" id="clinical-conflict-use-server">' +
    escHtml(actions.primaryTitle) +
    '<span class="btn-conflict-hint">' +
    escHtml(actions.primaryHint) +
    '</span></button>' +
    '<button type="button" class="btn-conflict-secondary" id="clinical-conflict-edit-draft">' +
    escHtml(actions.secondaryTitle) +
    '<span class="btn-conflict-hint">' +
    escHtml(actions.secondaryHint) +
    '</span></button>' +
    '<button type="button" class="btn-conflict-cancel" id="clinical-conflict-close">Cerrar sin decidir</button>' +
    '</div>' +
    detailBlock +
    '</div>';

  document.body.appendChild(backdrop);

  const dismiss = (cb) => {
    closeClinicalConflictViewer();
    if (typeof cb === 'function') cb();
  };

  const useServer = backdrop.querySelector('#clinical-conflict-use-server');
  const editDraft = backdrop.querySelector('#clinical-conflict-edit-draft');
  const closeBtn = backdrop.querySelector('#clinical-conflict-close');

  if (useServer) {
    useServer.addEventListener('click', () => dismiss(onUseServer));
  }
  if (editDraft) {
    editDraft.addEventListener('click', () => dismiss(onEditDraft));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => dismiss(onClose));
  }

  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) dismiss(onClose);
  });
}
