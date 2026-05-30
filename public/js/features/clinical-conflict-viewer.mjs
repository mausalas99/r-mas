const BACKDROP_ID = 'clinical-conflict-backdrop';

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatConflictValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_e) {
      return String(value);
    }
  }
  return String(value);
}

function collectDiffKeys(localData, serverData) {
  const keys = new Set([
    ...Object.keys(localData || {}),
    ...Object.keys(serverData || {}),
  ]);
  keys.delete('_deleted');
  return [...keys].sort((a, b) => a.localeCompare(b));
}

/**
 * @param {{ conflictingKeys?: string[], localData?: Record<string, unknown>, serverData?: Record<string, unknown> }} opts
 * @returns {string}
 */
export function buildConflictDiffHtml({ conflictingKeys, localData, serverData }) {
  const conflictSet = new Set(conflictingKeys || []);
  const keys = collectDiffKeys(localData, serverData);
  const rows = keys
    .map((key) => {
      const rowClass = conflictSet.has(key) ? 'conflict-field' : '';
      const localVal = formatConflictValue(localData?.[key]);
      const serverVal = formatConflictValue(serverData?.[key]);
      return (
        '<tr' +
        (rowClass ? ' class="' + rowClass + '"' : '') +
        '>' +
        '<th scope="row">' +
        escHtml(key) +
        '</th>' +
        '<td>' +
        escHtml(localVal) +
        '</td>' +
        '<td>' +
        escHtml(serverVal) +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    '<table class="clinical-conflict-diff" style="width:100%;border-collapse:collapse;font-size:12px;">' +
    '<thead><tr>' +
    '<th scope="col" style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:600;">Campo</th>' +
    '<th scope="col" style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:600;">Tu cambio</th>' +
    '<th scope="col" style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:600;">Servidor</th>' +
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
    onUseServer,
    onEditDraft,
    onClose,
  } = opts || {};

  closeClinicalConflictViewer();

  const diffHtml = buildConflictDiffHtml({ conflictingKeys, localData, serverData });
  const backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = BACKDROP_ID;
  if (draftId) backdrop.dataset.draftId = String(draftId);

  backdrop.innerHTML =
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="clinical-conflict-title" style="max-width:560px;max-height:90vh;">' +
    '<h3 id="clinical-conflict-title">Conflicto de sincronización</h3>' +
    '<p>Los cambios locales chocan con la versión del servidor en los campos resaltados. Elige cómo continuar.</p>' +
    '<style>.clinical-conflict-diff .conflict-field th,.clinical-conflict-diff .conflict-field td{background:rgba(220,38,38,0.08);font-weight:600;}</style>' +
    '<div style="overflow:auto;max-height:50vh;margin:0 -4px;padding:0 4px;">' +
    diffHtml +
    '</div>' +
    '<div class="lab-conflict-actions">' +
    '<button type="button" class="btn-conflict-primary" id="clinical-conflict-use-server">Usar servidor</button>' +
    '<button type="button" class="btn-conflict-secondary" id="clinical-conflict-edit-draft">Editar mi borrador</button>' +
    '<button type="button" class="btn-conflict-cancel" id="clinical-conflict-close">Cerrar</button>' +
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
