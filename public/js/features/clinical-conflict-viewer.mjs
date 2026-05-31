const BACKDROP_ID = 'clinical-conflict-backdrop';

const INTERNAL_DIFF_KEYS = new Set([
  'id',
  'patientId',
  'updatedAt',
  'version',
  'expectedVersion',
  '_deleted',
  'entityType',
  'entityId',
  'roomId',
  'clientId',
  'audit',
]);

const ENTITY_LABELS = {
  historiaClinica: 'Historia clínica',
  patient: 'Datos del paciente',
  todo: 'Pendiente',
  agenda: 'Evento de agenda',
  roomBundle: 'Sala (agenda y pendientes)',
};

const FIELD_LABELS = {
  identificacion: 'Identificación',
  motivoConsulta: 'Motivo de consulta',
  apnp: 'APNP',
  app: 'APP',
  ahf: 'AHF',
  genero: 'Género',
  sexual: 'Salud sexual',
  padecimientoActual: 'Padecimiento actual',
  datosNegados: 'Datos negados',
  ipas: 'IPAS',
  signosVitalesIngreso: 'Signos vitales de ingreso',
  labsAtAdmission: 'Labs de ingreso',
  labAnchor: 'Ancla de laboratorio',
  meta: 'Metadatos',
  labLookbackHours: 'Ventana de labs (h)',
  eventualidades: 'Eventualidades',
  nombre: 'Nombre',
  cuarto: 'Cuarto',
  cama: 'Cama',
  sexo: 'Sexo',
  edad: 'Edad',
  agenda: 'Agenda',
  todos: 'Pendientes',
  text: 'Descripción',
  completed: 'Completado',
  priority: 'Prioridad',
  createdAt: 'Fecha de creación',
  updatedAt: 'Última actualización',
  _deleted: 'Eliminado',
  entries: 'Entradas',
  manejo: 'Manejo',
};

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_e) {
      return false;
    }
  }
  return false;
}

function formatConflictValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try {
      return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    } catch (_e) {
      return value;
    }
  }
  if (typeof value === 'object') {
    try {
      const raw = JSON.stringify(value, null, 0);
      if (raw.length > 240) return raw.slice(0, 237) + '…';
      return raw;
    } catch (_e2) {
      return String(value);
    }
  }
  return String(value);
}

export function formatFieldLabel(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  if (FIELD_LABELS[k]) return FIELD_LABELS[k];
  return k
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function isInternalNoiseKey(key, localData, serverData) {
  if (!INTERNAL_DIFF_KEYS.has(key)) return false;
  const serverVal = serverData?.[key];
  if (serverVal === undefined || serverVal === null) return true;
  return valuesEqual(localData?.[key], serverVal);
}

function keysThatDiffer(localData, serverData) {
  const keys = new Set([...Object.keys(localData || {}), ...Object.keys(serverData || {})]);
  keys.delete('_deleted');
  return [...keys]
    .filter((key) => !isInternalNoiseKey(key, localData, serverData))
    .filter((key) => !valuesEqual(localData?.[key], serverData?.[key]))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string[]} [conflictingKeys]
 * @param {Record<string, unknown>} [localData]
 * @param {Record<string, unknown>} [serverData]
 * @returns {string[]}
 */
export function pickDiffKeys(conflictingKeys, localData, serverData) {
  const raw = Array.isArray(conflictingKeys) ? conflictingKeys.filter(Boolean) : [];
  const onlyStar = raw.length === 1 && raw[0] === '*';

  if (raw.length && !onlyStar) {
    return raw
      .filter((key) => !isInternalNoiseKey(key, localData, serverData))
      .sort((a, b) => a.localeCompare(b));
  }

  return keysThatDiffer(localData, serverData).filter((key) => {
    if (!INTERNAL_DIFF_KEYS.has(key)) return true;
    return !valuesEqual(localData?.[key], serverData?.[key]);
  });
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
  return {
    primaryTitle: 'Usar versión del servidor',
    primaryHint:
      'Descarta este intento de guardado y carga lo que ya guardó la sala o el host. Se elimina el borrador guardado.',
    secondaryTitle: 'Seguir con mi borrador',
    secondaryHint:
      'Cierra el comparador y mantén tus cambios en pantalla. El borrador queda en Ajustes → LAN.',
    tagline: 'Elige qué copia conservar antes de seguir editando.',
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

  return (
    '<div class="clinical-conflict-context">' +
    '<p class="clinical-conflict-context-lead"><strong>' +
    lead +
    '</strong></p>' +
    (patientRef ? '<p class="clinical-conflict-context-patient">' + patientRef + '</p>' : '') +
    '<p class="clinical-conflict-context-body">' +
    escHtml(cause) +
    '</p>' +
    versionHtml +
    '</div>'
  );
}

/**
 * @param {{ conflictingKeys?: string[], localData?: Record<string, unknown>, serverData?: Record<string, unknown> }} opts
 * @returns {string}
 */
export function buildConflictDiffHtml({ conflictingKeys, localData, serverData }) {
  const conflictSet = new Set(conflictingKeys || []);
  const keys = pickDiffKeys(conflictingKeys, localData, serverData);

  if (!keys.length) {
    return (
      '<p class="clinical-conflict-diff-empty">' +
      'No hay detalle campo por campo para este conflicto (suele pasar al eliminar o por desfase de versión). ' +
      'Lee las dos opciones de abajo: una conserva lo de la sala, la otra reintenta tu acción.' +
      '</p>'
    );
  }

  const rows = keys
    .map((key) => {
      const rowClass = conflictSet.has(key) || conflictSet.has('*') ? 'conflict-field' : '';
      const localVal = formatConflictValue(localData?.[key]);
      const serverVal = formatConflictValue(serverData?.[key]);
      const serverMissing = serverData?.[key] === undefined || serverData?.[key] === null;
      return (
        '<tr' +
        (rowClass ? ' class="' + rowClass + '"' : '') +
        '>' +
        '<th scope="row">' +
        escHtml(formatFieldLabel(key)) +
        '<span class="clinical-conflict-key-muted">' +
        escHtml(key) +
        '</span></th>' +
        '<td class="clinical-conflict-val--local">' +
        escHtml(localVal) +
        '</td>' +
        '<td class="clinical-conflict-val--server' +
        (serverMissing ? ' clinical-conflict-val--missing' : '') +
        '">' +
        escHtml(serverVal) +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    '<table class="clinical-conflict-diff">' +
    '<thead><tr>' +
    '<th scope="col">Campo</th>' +
    '<th scope="col">Tu intento de guardado</th>' +
    '<th scope="col">En la sala ahora</th>' +
    '</tr></thead><tbody>' +
    rows +
    '</tbody></table>'
  );
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
  const diffHtml = buildConflictDiffHtml({ conflictingKeys, localData, serverData });
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
    '<p class="clinical-conflict-diff-intro">Detalle del choque (si aplica):</p>' +
    '<div class="clinical-conflict-diff-wrap">' +
    diffHtml +
    '</div>' +
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
    '</div></div>';

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
