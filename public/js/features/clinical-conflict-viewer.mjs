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
  apnp: 'Antecedentes no patológicos',
  app: 'Antecedentes patológicos',
  ahf: 'Antecedentes heredofamiliares',
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

const HC_STRUCTURED_KEYS = new Set(['ahf', 'app', 'apnp', 'ipas', 'genero', 'identificacion', 'signosVitalesIngreso']);

function trimCollapse(text, maxLen) {
  const max = maxLen == null ? 140 : maxLen;
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)) + '…';
}

function summarizeEntryRow(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const bits = [];
  if (entry.descripcionDetallada) bits.push(trimCollapse(entry.descripcionDetallada, 90));
  if (entry.diagnosis) bits.push('dx: ' + trimCollapse(entry.diagnosis, 50));
  if (entry.treatment) bits.push('tto: ' + trimCollapse(entry.treatment, 50));
  if (entry.description) bits.push(trimCollapse(entry.description, 60));
  if (entry.medication) bits.push(trimCollapse(entry.medication, 40));
  if (entry.relativeId && !bits.length) bits.push('familiar ' + String(entry.relativeId));
  return bits.join(' · ');
}

function summarizeIpasBlock(ipas) {
  if (!ipas || typeof ipas !== 'object') return '';
  const lines = [];
  for (const block of Object.values(ipas)) {
    if (!block || typeof block !== 'object') continue;
    const desc = trimCollapse(block.descripcion, 72);
    const checks = Array.isArray(block.checks) ? block.checks.length : 0;
    if (desc && desc.toLowerCase() !== 'interrogado y negado') {
      lines.push(desc);
    } else if (checks > 0) {
      lines.push(checks + ' hallazgo' + (checks === 1 ? '' : 's'));
    }
    if (lines.length >= 2) break;
  }
  if (!lines.length) return 'interrogado y negado';
  return lines.join(' · ');
}

/**
 * Human-readable one-line preview for conflict diff (no raw JSON).
 * @param {string} [fieldKey]
 * @param {unknown} value
 * @returns {string}
 */
export function summarizeConflictFieldValue(fieldKey, value) {
  const key = String(fieldKey || '').trim();
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      } catch (_e) {
        return trimCollapse(value) || '—';
      }
    }
    const t = trimCollapse(value);
    return t || '—';
  }
  if (Array.isArray(value)) {
    if (!value.length) return 'vacío';
    const previews = value
      .slice(0, 2)
      .map((item) => (typeof item === 'object' ? summarizeEntryRow(item) : trimCollapse(item, 60)))
      .filter(Boolean);
    const tail = value.length > 2 ? ' (+' + (value.length - 2) + ' más)' : '';
    return (previews.length ? previews.join('; ') : value.length + ' elemento' + (value.length === 1 ? '' : 's')) + tail;
  }
  if (typeof value !== 'object') return String(value);

  if (key === 'ipas') return summarizeIpasBlock(value) || '—';

  const parts = [];
  const desc = value.descripcionDetallada || value.descripcion;
  if (desc && String(desc).trim()) parts.push(trimCollapse(desc, 110));

  const entries = value.entries;
  if (Array.isArray(entries) && entries.length) {
    const rowText = entries
      .slice(0, 3)
      .map(summarizeEntryRow)
      .filter(Boolean)
      .join('; ');
    if (rowText) parts.push(rowText);
    if (entries.length > 3) parts.push('+' + (entries.length - 3) + ' registro' + (entries.length - 3 === 1 ? '' : 's'));
  }

  const condCount = Array.isArray(value.conditions) ? value.conditions.length : 0;
  if (condCount && !entries?.length) {
    parts.push(condCount + ' condición' + (condCount === 1 ? '' : 'es'));
  }

  for (const habitKey of ['tabaquismo', 'alcoholismo', 'toxicomanias', 'dieta', 'tatuajes', 'deportesPasatiemposMascotas']) {
    if (value[habitKey] && String(value[habitKey]).trim()) {
      parts.push(trimCollapse(value[habitKey], 55));
    }
  }

  if (value.medicamentosActuales && String(value.medicamentosActuales).trim()) {
    parts.push('Meds: ' + trimCollapse(value.medicamentosActuales, 70));
  }
  if (value.hospitalizacionesPrevias && String(value.hospitalizacionesPrevias).trim()) {
    parts.push('Hosp. prev.: ' + trimCollapse(value.hospitalizacionesPrevias, 60));
  }

  if (key === 'genero') {
    for (const gKey of ['menarquia', 'gestas', 'partos', 'cesareas', 'abortos', 'notas', 'ultimaMenstruacion']) {
      if (value[gKey] != null && String(value[gKey]).trim()) {
        parts.push(formatFieldLabel(gKey) + ': ' + trimCollapse(value[gKey], 40));
      }
    }
  }

  if (key === 'identificacion' && typeof value === 'object') {
    const idBits = ['lugarNacimiento', 'residencia', 'ocupacionActual', 'dx', 'cama']
      .map((k) => (value[k] ? formatFieldLabel(k) + ': ' + trimCollapse(value[k], 35) : ''))
      .filter(Boolean);
    if (idBits.length) parts.push(idBits.slice(0, 3).join(' · '));
  }

  if (parts.length) return parts.join(' · ');

  if (HC_STRUCTURED_KEYS.has(key)) return 'bloque sin texto legible';
  try {
    const raw = JSON.stringify(value);
    return raw.length > 120 ? trimCollapse(raw, 117) : raw;
  } catch (_e2) {
    return '—';
  }
}

function formatConflictValue(value, fieldKey) {
  return summarizeConflictFieldValue(fieldKey, value);
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

/**
 * @param {{ conflictingKeys?: string[], localData?: Record<string, unknown>, serverData?: Record<string, unknown> }} opts
 * @returns {{ summaryHtml: string, detailHtml: string, keyCount: number }}
 */
/**
 * Si el resumen legible coincide en todas las secciones en conflicto, se puede alinear con la sala sin modal.
 * @param {{ conflictingKeys?: string[], localData?: Record<string, unknown>, serverData?: Record<string, unknown> }} opts
 */
export function conflictSnapshotsMatchForAutoResolve({ conflictingKeys, localData, serverData }) {
  const keys = pickDiffKeys(conflictingKeys, localData, serverData);
  if (!keys.length) return false;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const localVal = summarizeConflictFieldValue(key, localData?.[key]);
    const serverVal = summarizeConflictFieldValue(key, serverData?.[key]);
    if (localVal !== serverVal || localVal === '—') return false;
  }
  return true;
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
  const diffParts = buildConflictDiffParts({ conflictingKeys, localData, serverData });
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
