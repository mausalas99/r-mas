import { parseDriveDocument } from '../../../lib/drive-import/parse-drive-document.mjs';
import { applyDriveImport } from './drive-import-apply.mjs';
import { labHistory } from '../app-state.mjs';
import { listHcPatchSectionKeys } from '../../../lib/drive-import/map-universal-hc.mjs';
import {
  buildDriveImportReviewSteps,
  applyReviewStepsToParsed,
  patchReviewStep,
  reviewStepHint,
} from '../../../lib/drive-import/drive-import-review.mjs';
import { enrichHcPatchWithStructuredSuggestions } from '../../../lib/drive-import/hc-structured-extract.mjs';

let rt = {
  getActiveId() {
    return null;
  },
  getActivePatient() {
    return null;
  },
  showToast(_msg, _type) {},
  pushUndoSnapshot(_label) {},
  switchInnerTab(_tab) {},
  switchAppTab(_tab) {},
  addAuditEntry(_action, _result, _count, _detail) {},
};

let _debounceId = null;
let _autoReviewPending = false;
let _importBusy = false;
/** @type {'paste' | 'review'} */
let _modalStep = 'paste';
/** @type {import('../../../lib/drive-import/drive-import-review.mjs').DriveImportReviewStep[]} */
let _reviewSteps = [];
let _reviewIndex = 0;

export function registerDriveImportRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

function getBackdrop() {
  return document.getElementById('drive-import-backdrop');
}

function getTextarea() {
  return /** @type {HTMLTextAreaElement | null} */ (document.getElementById('drive-import-input'));
}

function getParseHintEl() {
  return document.getElementById('drive-import-parse-hint');
}

function getModalEl() {
  return document.querySelector('.drive-import-modal');
}

function getWarningEl() {
  return document.getElementById('drive-import-warning');
}

function getApplyMode() {
  const checked = document.querySelector('input[name="drive-import-mode"]:checked');
  const v = checked ? String(checked.value) : 'fill';
  if (v === 'replace' || v === 'eventos') return v;
  return 'fill';
}

function getParsed() {
  const ta = getTextarea();
  const patient = rt.getActivePatient();
  const existing =
    patient && patient.eventualidades && Array.isArray(patient.eventualidades.entries)
      ? patient.eventualidades.entries
      : [];
  const existingLabs =
    patient && patient.id && labHistory[patient.id] ? labHistory[patient.id] : [];
  return parseDriveDocument(ta ? ta.value : '', {
    existingEventualidades: existing,
    existingLabHistory: existingLabs,
    applyMode: getApplyMode(),
  });
}

function hasImportableContent(parsed, mode) {
  const hcKeys = listHcPatchSectionKeys(parsed.hcPatch || {});
  const evTotal = (parsed.eventualidades.entries || []).length;
  const evSkipped = parsed.eventualidades.skippedEstimate || 0;
  const evWillAdd = Math.max(0, evTotal - evSkipped);
  const labsWillAdd = (parsed.laboratorios.sets || []).length;
  const willTouchHc = mode !== 'eventos' && hcKeys.length > 0;
  return willTouchHc || evWillAdd > 0 || labsWillAdd > 0;
}

function updateDocSummary() {
  const ta = getTextarea();
  const el = document.getElementById('drive-import-doc-summary');
  if (!el || !ta) return;
  const text = String(ta.value || '');
  if (!text.trim()) {
    el.textContent = '';
    return;
  }
  const lines = text.split(/\r?\n/).length;
  el.textContent =
    'Documento pegado · ' + lines + ' línea' + (lines === 1 ? '' : 's') + ' · ' + text.length + ' caracteres';
}

function refreshPreview() {
  const parseHint = getParseHintEl();
  const warn = getWarningEl();
  const confirmBtn = document.getElementById('drive-import-confirm');
  const fastBtn = document.getElementById('drive-import-apply-fast');

  const ta = getTextarea();
  if (!ta || !String(ta.value || '').trim()) {
    if (parseHint) {
      parseHint.hidden = true;
      parseHint.textContent = '';
    }
    if (warn) warn.hidden = true;
    if (confirmBtn) confirmBtn.disabled = true;
    if (fastBtn) fastBtn.disabled = true;
    updateDocSummary();
    return;
  }

  let parsed;
  try {
    parsed = getParsed();
  } catch (err) {
    if (parseHint) {
      parseHint.hidden = false;
      parseHint.textContent = 'Error al analizar: ' + (err && err.message ? err.message : String(err));
    }
    if (confirmBtn) confirmBtn.disabled = true;
    if (fastBtn) fastBtn.disabled = true;
    updateDocSummary();
    return;
  }

  const mode = getApplyMode();
  const canImport = hasImportableContent(parsed, mode);
  if (parseHint) {
    if (canImport) {
      parseHint.hidden = true;
      parseHint.textContent = '';
    } else {
      parseHint.hidden = false;
      parseHint.textContent = 'No se detectó contenido importable con el modo seleccionado.';
    }
  }

  const patient = rt.getActivePatient();
  if (warn && patient && parsed.header && parsed.header.registro) {
    const mismatch =
      String(parsed.header.registro).trim() &&
      String(patient.registro || '').trim() &&
      String(parsed.header.registro).trim() !== String(patient.registro).trim();
    warn.hidden = !mismatch;
    warn.textContent = mismatch
      ? 'El registro del documento (' +
        parsed.header.registro +
        ') no coincide con el paciente activo (' +
        patient.registro +
        ').'
      : '';
  } else if (warn) {
    warn.hidden = true;
  }

  if (confirmBtn) confirmBtn.disabled = !canImport;
  if (fastBtn) fastBtn.disabled = !canImport;
  updateDocSummary();
}

function setReviewImportBusy(busy) {
  _importBusy = busy;
  const nextBtn = document.getElementById('drive-import-review-next');
  const fastBtn = document.getElementById('drive-import-apply-fast');
  const confirmBtn = document.getElementById('drive-import-confirm');
  if (nextBtn) {
    nextBtn.disabled = busy;
    if (busy) nextBtn.textContent = 'Importando…';
    else if (_modalStep === 'review') renderReviewStep();
  }
  if (fastBtn) fastBtn.disabled = busy;
  if (confirmBtn && busy) confirmBtn.disabled = true;
  if (!busy) refreshPreview();
}

function confirmDriveImportChoice(message) {
  const bd = getBackdrop();
  const wasOpen = !!(bd && bd.classList.contains('open'));
  if (bd && wasOpen) {
    bd.classList.remove('open');
    bd.setAttribute('aria-hidden', 'true');
  }
  let ok = false;
  try {
    ok = confirm(message);
  } finally {
    if (bd && wasOpen) {
      bd.classList.add('open');
      bd.setAttribute('aria-hidden', 'false');
    }
  }
  return ok;
}

function hasApprovedReviewContent(parsed) {
  const hcKeys = listHcPatchSectionKeys(parsed.hcPatch || {});
  const evCount = (parsed.eventualidades.entries || []).length;
  const labCount = (parsed.laboratorios.sets || []).length;
  return hcKeys.length > 0 || evCount > 0 || labCount > 0;
}

function getReviewBuildOpts(parsed) {
  const patient = rt.getActivePatient();
  return {
    applyMode: getApplyMode(),
    existingEventualidades:
      patient && patient.eventualidades && Array.isArray(patient.eventualidades.entries)
        ? patient.eventualidades.entries
        : [],
    existingLabHistory:
      patient && patient.id && labHistory[patient.id] ? labHistory[patient.id] : [],
    createNew: !patient,
  };
}

function tryAutoStartReview() {
  if (_modalStep !== 'paste' || !_autoReviewPending) return;
  _autoReviewPending = false;
  const ta = getTextarea();
  if (!ta || !String(ta.value || '').trim()) return;

  let parsed;
  try {
    parsed = getParsed();
  } catch (_err) {
    return;
  }

  const mode = getApplyMode();
  if (!hasImportableContent(parsed, mode)) return;

  const patient = rt.getActivePatient();
  const steps = buildDriveImportReviewSteps(parsed, getReviewBuildOpts(parsed));
  if (!steps.length) return;

  _reviewSteps = steps;
  _reviewIndex = 0;
  setModalStep('review');
  renderReviewStep();
  const editor = document.getElementById('drive-import-review-editor');
  if (editor && !editor.hidden) editor.focus();
}

function onPasteInputChanged() {
  const ta = getTextarea();
  const hasText = !!(ta && String(ta.value || '').trim());
  if (!hasText) {
    _autoReviewPending = false;
    refreshPreview();
    return;
  }
  _autoReviewPending = true;
  refreshPreview();
  if (_debounceId) clearTimeout(_debounceId);
  _debounceId = setTimeout(function () {
    _debounceId = null;
    tryAutoStartReview();
  }, 320);
}

function syncConfirmLabel() {
  const btn = document.getElementById('drive-import-confirm');
  const modeFs = document.getElementById('drive-import-mode-fieldset');
  const patient = rt.getActivePatient();
  if (modeFs) modeFs.style.display = patient ? '' : 'none';
  if (!btn || _modalStep !== 'paste') return;
  btn.textContent = 'Revisar secciones…';
}

function setModalStep(step) {
  _modalStep = step;
  const modal = getModalEl();
  const pasteEl = document.getElementById('drive-import-step-paste');
  const reviewEl = document.getElementById('drive-import-step-review');
  const actionsPaste = document.getElementById('drive-import-actions-paste');
  const actionsReview = document.getElementById('drive-import-actions-review');
  const prevBtn = document.getElementById('drive-import-review-prev');
  const title = document.getElementById('drive-import-title');
  const hint = document.getElementById('drive-import-hint');
  const modeFs = document.getElementById('drive-import-mode-fieldset');

  if (modal) modal.setAttribute('data-drive-step', step);
  if (pasteEl) pasteEl.hidden = step !== 'paste';
  if (reviewEl) reviewEl.hidden = step !== 'review';
  if (actionsPaste) actionsPaste.hidden = step !== 'paste';
  if (actionsReview) actionsReview.hidden = step !== 'review';
  if (modeFs) modeFs.hidden = step === 'review';
  if (title) {
    title.textContent = step === 'review' ? 'Revisar importación' : 'Importar desde Drive';
  }
  if (hint) {
    hint.textContent =
      step === 'review'
        ? 'Confirma o edita cada sección antes de importar.'
        : 'Pega el documento copiado desde Google Docs. Revisarás cada sección antes de importar.';
  }
  if (step === 'review') updateDocSummary();
  syncConfirmLabel();
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEvDate(iso) {
  if (!iso) return 'sin fecha';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'sin fecha';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return dd + '/' + mm + '/' + yy;
}

function syncCurrentReviewStepFromUi() {
  const step = _reviewSteps[_reviewIndex];
  if (!step) return;
  const includeEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById('drive-import-review-include')
  );
  const editor = /** @type {HTMLTextAreaElement | null} */ (
    document.getElementById('drive-import-review-editor')
  );

  if (step.kind === 'hc') {
    patchReviewStep(step, {
      include: includeEl ? includeEl.checked : true,
      editText: editor ? editor.value : step.editText,
      structuredSuggestions: readStructuredSuggestionsFromUi(),
    });
    return;
  }
  if (step.kind === 'header') {
    patchReviewStep(step, { include: includeEl ? includeEl.checked : true });
    return;
  }
  if (step.kind === 'eventos') {
    const rows = document.querySelectorAll('[data-drive-ev-idx]');
    /** @type {Array<{ include?: boolean, text?: string }>} */
    const entries = [];
    rows.forEach(function (row) {
      const idx = Number(row.getAttribute('data-drive-ev-idx'));
      const cb = row.querySelector('input[type="checkbox"]');
      const ta = row.querySelector('textarea');
      entries[idx] = {
        include: cb ? cb.checked : true,
        text: ta ? ta.value : '',
      };
    });
    patchReviewStep(step, { entries: entries });
    return;
  }
  if (step.kind === 'labs') {
    const rows = document.querySelectorAll('[data-drive-lab-idx]');
    /** @type {Array<{ include?: boolean }>} */
    const sets = [];
    rows.forEach(function (row) {
      const idx = Number(row.getAttribute('data-drive-lab-idx'));
      const cb = row.querySelector('input[type="checkbox"]');
      sets[idx] = { include: cb ? cb.checked : true };
    });
    patchReviewStep(step, { sets: sets });
  }
}

function renderReviewDots() {
  const dots = document.getElementById('drive-import-review-dots');
  if (!dots) return;
  dots.innerHTML = '';
  _reviewSteps.forEach(function (step, idx) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drive-import-review-dot' + (idx === _reviewIndex ? ' is-active' : '');
    btn.title = step.label;
    btn.setAttribute('aria-label', step.label + ' (' + (idx + 1) + ' de ' + _reviewSteps.length + ')');
    btn.setAttribute('aria-current', idx === _reviewIndex ? 'step' : 'false');
    btn.addEventListener('click', function () {
      syncCurrentReviewStepFromUi();
      _reviewIndex = idx;
      renderReviewStep();
    });
    dots.appendChild(btn);
  });
}

function readStructuredSuggestionsFromUi() {
  /** @type {Array<{ include?: boolean }>} */
  const rows = [];
  document.querySelectorAll('[data-drive-struct-idx]').forEach(function (row) {
    const idx = Number(row.getAttribute('data-drive-struct-idx'));
    const cb = row.querySelector('input[type="checkbox"]');
    rows[idx] = { include: cb ? cb.checked : true };
  });
  return rows;
}

function renderStructuredSuggestions(step) {
  const host = document.getElementById('drive-import-review-structured');
  if (!host) return;
  const suggestions = step.structuredSuggestions || [];
  if (!suggestions.length) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  host.hidden = false;
  let html =
    '<div class="drive-import-structured-head">Campos detectados — marcar para agregar a casillas estructuradas</div>' +
    '<div class="drive-import-structured-list">';
  suggestions.forEach(function (s, idx) {
    html +=
      '<label class="drive-import-structured-row" data-drive-struct-idx="' +
      idx +
      '">' +
      '<input type="checkbox"' +
      (s.include !== false ? ' checked' : '') +
      ' aria-label="' +
      escapeHtml(s.label) +
      '" />' +
      '<span class="drive-import-structured-label">' +
      escapeHtml(s.label) +
      '</span></label>';
  });
  html += '</div>';
  host.innerHTML = html;
}

function renderReviewStep() {
  const step = _reviewSteps[_reviewIndex];
  const progress = document.getElementById('drive-import-review-progress');
  const titleEl = document.getElementById('drive-import-review-title');
  const hintEl = document.getElementById('drive-import-review-hint');
  const includeWrap = document.getElementById('drive-import-review-include-wrap');
  const includeEl = /** @type {HTMLInputElement | null} */ (
    document.getElementById('drive-import-review-include')
  );
  const editor = /** @type {HTMLTextAreaElement | null} */ (
    document.getElementById('drive-import-review-editor')
  );
  const listEl = document.getElementById('drive-import-review-list');
  const nextBtn = document.getElementById('drive-import-review-next');
  const prevBtn = document.getElementById('drive-import-review-prev');

  if (!step) return;

  if (progress) {
    progress.textContent =
      'Sección ' + (_reviewIndex + 1) + ' de ' + _reviewSteps.length + ' · ' + step.label;
  }
  if (titleEl) titleEl.textContent = step.label;
  if (hintEl) hintEl.textContent = reviewStepHint(step);
  if (prevBtn) prevBtn.disabled = _reviewIndex <= 0;
  if (nextBtn) {
    nextBtn.textContent =
      _reviewIndex >= _reviewSteps.length - 1 ? 'Importar lo aprobado' : 'Siguiente sección';
  }

  renderReviewDots();

  const isList = step.kind === 'eventos' || step.kind === 'labs';
  const isHeader = step.kind === 'header';

  if (includeWrap) includeWrap.hidden = isList;
  if (editor) {
    editor.hidden = isList || isHeader;
    editor.style.display = isList || isHeader ? 'none' : '';
  }
  if (listEl) listEl.hidden = !isList && !isHeader;

  if (step.kind === 'hc' && includeEl && editor) {
    includeEl.checked = step.include;
    editor.value = step.editText;
    editor.readOnly = false;
    renderStructuredSuggestions(step);
    return;
  }

  if (isList || isHeader) {
    const structHost = document.getElementById('drive-import-review-structured');
    if (structHost) {
      structHost.hidden = true;
      structHost.innerHTML = '';
    }
  }

  if (step.kind === 'header' && includeEl && listEl) {
    includeEl.checked = step.include;
    const h = step.header || {};
    const bits = [];
    if (h.nombre) bits.push('Nombre: ' + h.nombre);
    if (h.registro) bits.push('Registro: ' + h.registro);
    if (h.edad) bits.push('Edad: ' + h.edad);
    if (h.cama) bits.push('Cama: ' + h.cama);
    if (h.sexo) bits.push('Sexo: ' + h.sexo);
    listEl.hidden = false;
    listEl.innerHTML =
      '<pre class="drive-import-review-header-pre">' + escapeHtml(bits.join('\n')) + '</pre>';
    return;
  }

  if (step.kind === 'eventos' && listEl) {
    listEl.hidden = false;
    let html = '';
    step.entries.forEach(function (entry, idx) {
      const date = formatEvDate(entry.at);
      html +=
        '<div class="drive-import-review-row" data-drive-ev-idx="' +
        idx +
        '">' +
        '<label class="drive-import-review-row-check">' +
        '<input type="checkbox"' +
        (entry.include ? ' checked' : '') +
        ' aria-label="Incluir eventualidad ' +
        (idx + 1) +
        '" />' +
        '<span class="drive-import-review-row-date">' +
        escapeHtml(date) +
        '</span></label>' +
        '<textarea class="drive-import-review-row-text" rows="3" spellcheck="true">' +
        escapeHtml(entry.text) +
        '</textarea></div>';
    });
    listEl.innerHTML = html;
    return;
  }

  if (step.kind === 'labs' && listEl) {
    listEl.hidden = false;
    let html =
      '<div class="drive-import-labs-table-wrap"><table class="drive-import-labs-table"><thead><tr>' +
      '<th scope="col" class="drive-import-labs-col-check">Incluir</th>' +
      '<th scope="col">Fecha</th><th scope="col">Paneles</th><th scope="col">Estado</th>' +
      '</tr></thead><tbody>';
    step.sets.forEach(function (set, idx) {
      const panels = escapeHtml(String(set.summary || '').replace(/^[^—]+—\s*/, ''));
      const statusClass = set.isDuplicate
        ? 'drive-import-lab-status drive-import-lab-status--dup'
        : 'drive-import-lab-status drive-import-lab-status--new';
      const statusText = set.isDuplicate ? 'En historial' : 'Nueva';
      html +=
        '<tr class="drive-import-labs-row' +
        (set.isDuplicate ? ' is-duplicate' : '') +
        '" data-drive-lab-idx="' +
        idx +
        '">' +
        '<td class="drive-import-labs-col-check"><input type="checkbox"' +
        (set.include ? ' checked' : '') +
        ' aria-label="Incluir laboratorio ' +
        escapeHtml(set.fecha || '') +
        '" /></td>' +
        '<td class="drive-import-labs-fecha">' +
        escapeHtml(set.fecha || '') +
        '</td>' +
        '<td class="drive-import-labs-panels">' +
        panels +
        '</td>' +
        '<td><span class="' +
        statusClass +
        '">' +
        statusText +
        '</span></td></tr>';
    });
    html += '</tbody></table></div>';
    listEl.innerHTML = html;
  }
}

export function driveImportBackToPaste() {
  syncCurrentReviewStepFromUi();
  _autoReviewPending = false;
  setModalStep('paste');
  const ta = getTextarea();
  if (ta) {
    ta.focus();
    try {
      ta.setSelectionRange(ta.value.length, ta.value.length);
    } catch (_e) {
      /* noop */
    }
  }
}

export function driveImportReviewPrev() {
  if (_reviewIndex <= 0) return;
  syncCurrentReviewStepFromUi();
  _reviewIndex -= 1;
  renderReviewStep();
}

export async function driveImportReviewNext() {
  if (_importBusy) return;
  try {
    syncCurrentReviewStepFromUi();
    if (_reviewIndex >= _reviewSteps.length - 1) {
      await finishReviewAndImport();
      return;
    }
    _reviewIndex += 1;
    renderReviewStep();
  } catch (err) {
    console.error('[drive-import] review next failed', err);
    rt.showToast('No se pudo completar la revisión', 'error');
    setReviewImportBusy(false);
  }
}

export function startDriveImportReview() {
  const ta = getTextarea();
  if (!ta || !String(ta.value || '').trim()) {
    rt.showToast('Pega el contenido del documento', 'error');
    return;
  }

  let parsed;
  try {
    parsed = getParsed();
  } catch (_err) {
    rt.showToast('No se pudo analizar el texto', 'error');
    return;
  }

  _reviewSteps = buildDriveImportReviewSteps(parsed, getReviewBuildOpts(parsed));

  if (!_reviewSteps.length) {
    rt.showToast('No hay secciones para revisar en este pegado', 'info');
    return;
  }

  _reviewIndex = 0;
  _autoReviewPending = false;
  setModalStep('review');
  renderReviewStep();
  const editor = document.getElementById('drive-import-review-editor');
  if (editor && !editor.hidden) editor.focus();
}

export function openDriveImportModal() {
  const bd = getBackdrop();
  if (!bd) {
    rt.showToast('Importación desde Drive no disponible', 'error');
    return;
  }
  const ta = getTextarea();
  if (ta) ta.value = '';
  _reviewSteps = [];
  _reviewIndex = 0;
  _autoReviewPending = false;
  _importBusy = false;
  setModalStep('paste');
  syncConfirmLabel();
  refreshPreview();
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  if (ta) ta.focus();
}

export function closeDriveImportModal() {
  const bd = getBackdrop();
  if (!bd) return;
  if (_modalStep === 'review') syncCurrentReviewStepFromUi();
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  setModalStep('paste');
  _reviewSteps = [];
  _reviewIndex = 0;
  _importBusy = false;
}

async function finishReviewAndImport() {
  if (_importBusy) return;
  setReviewImportBusy(true);
  try {
    syncCurrentReviewStepFromUi();
    let parsed;
    try {
      parsed = getParsed();
    } catch (_err) {
      rt.showToast('No se pudo analizar el texto', 'error');
      return;
    }
    parsed = applyReviewStepsToParsed(parsed, _reviewSteps, { createNew: !rt.getActivePatient() });
    if (!hasApprovedReviewContent(parsed)) {
      rt.showToast('No hay secciones marcadas para importar', 'info');
      return;
    }
    await Promise.race([
      runDriveImport(parsed, { fromReview: true }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('import-timeout'));
        }, 12000);
      }),
    ]);
  } catch (err) {
    console.error('[drive-import] import failed', err);
    if (err && err.message === 'import-timeout') {
      rt.showToast('La importación tardó demasiado. Revisa si los datos se guardaron.', 'error');
    } else {
      rt.showToast('Error al importar desde Drive', 'error');
    }
  } finally {
    setReviewImportBusy(false);
  }
}

export async function confirmDriveImport() {
  if (_importBusy) return;
  setReviewImportBusy(true);
  try {
    const ta = getTextarea();
    if (!ta || !String(ta.value || '').trim()) {
      rt.showToast('Pega el contenido del documento', 'error');
      return;
    }
    let parsed;
    try {
      parsed = getParsed();
    } catch (_err) {
      rt.showToast('No se pudo analizar el texto', 'error');
      return;
    }
    await runDriveImport(parsed, { fromReview: false });
  } catch (err) {
    console.error('[drive-import] fast import failed', err);
    rt.showToast('Error al importar desde Drive', 'error');
  } finally {
    setReviewImportBusy(false);
  }
}

/**
 * @param {ReturnType<typeof parseDriveDocument>} parsed
 * @param {{ fromReview?: boolean }} opts
 */
async function runDriveImport(parsed, opts) {
  opts = opts || {};
  const mode = getApplyMode();
  const patient = rt.getActivePatient();
  const createNew = !patient;

  if (
    patient &&
    parsed.header &&
    parsed.header.registro &&
    patient.registro &&
    String(parsed.header.registro).trim() !== String(patient.registro).trim()
  ) {
    if (
      !confirmDriveImportChoice(
        'El registro del documento (' +
          parsed.header.registro +
          ') no coincide con ' +
          patient.registro +
          '. ¿Continuar de todos modos?'
      )
    ) {
      return;
    }
  }

  if (!opts.fromReview && mode === 'replace') {
    if (
      !confirmDriveImportChoice(
        'Se sobrescribirán las secciones de Historia clínica presentes en el documento. ¿Continuar?'
      )
    ) {
      return;
    }
  }

  if (createNew && (!parsed.header || !parsed.header.nombre)) {
    if (!confirmDriveImportChoice('No se detectó nombre en el encabezado. ¿Crear paciente igualmente?')) {
      return;
    }
  }

  if (typeof rt.pushUndoSnapshot === 'function') {
    rt.pushUndoSnapshot('Importar desde Drive');
  }

  if (!opts.fromReview) {
    parsed = Object.assign({}, parsed, {
      hcPatch: enrichHcPatchWithStructuredSuggestions(parsed.hcPatch || {}, parsed.driveSections || {}),
    });
  }

  const result = await applyDriveImport(parsed, {
    mode: mode,
    activePatient: patient,
    createNew: createNew,
    fromReview: !!opts.fromReview,
  });

  if (!result.ok) {
    if (result.error === 'hc-conflict') {
      rt.showToast('Conflicto al guardar Historia clínica en LAN. Recarga e intenta de nuevo.', 'error');
    } else {
      rt.showToast('No se pudo aplicar la importación', 'error');
    }
    return;
  }

  if (typeof rt.addAuditEntry === 'function') {
    rt.addAuditEntry(
      'drive-import',
      'ok',
      result.evAdded || 0,
      JSON.stringify({
        mode: mode,
        skipped: result.evSkipped,
        labAdded: result.labAdded,
        labSkipped: result.labSkipped,
        createNew: createNew,
        reviewed: !!opts.fromReview,
      })
    );
  }

  closeDriveImportModal();

  const parts = [];
  if (mode !== 'eventos') parts.push('HC actualizada');
  parts.push(
    (result.evAdded || 0) +
      ' eventualidad' +
      (result.evAdded === 1 ? '' : 'es') +
      ' nueva' +
      (result.evAdded === 1 ? '' : 's')
  );
  if (result.evSkipped) {
    parts.push(
      result.evSkipped +
        ' duplicada' +
        (result.evSkipped === 1 ? '' : 's') +
        ' omitida' +
        (result.evSkipped === 1 ? '' : 's')
    );
  }
  if (result.labAdded) {
    parts.push(
      result.labAdded +
        ' fecha' +
        (result.labAdded === 1 ? '' : 's') +
        ' de laboratorio nueva' +
        (result.labAdded === 1 ? '' : 's')
    );
  }
  if (result.labSkipped) {
    parts.push(
      result.labSkipped +
        ' lab' +
        (result.labSkipped === 1 ? '' : 's') +
        ' duplicado' +
        (result.labSkipped === 1 ? '' : 's') +
        ' omitido' +
        (result.labSkipped === 1 ? '' : 's')
    );
  }
  if (result.lanSyncDeferred) {
    parts.push('sincronización con la sala en segundo plano');
  }
  rt.showToast(parts.join(' · '), 'success');

  if (result.navigateTo === 'lab') {
    if (typeof rt.switchAppTab === 'function') rt.switchAppTab('lab');
  } else {
    if (typeof rt.switchAppTab === 'function') rt.switchAppTab('clinico');
    if (typeof rt.switchInnerTab === 'function') {
      rt.switchInnerTab(result.navigateTo || 'historia', { forceRender: true });
    }
  }
}

function wireDriveImportActionButtons() {
  const actions = [
    ['drive-import-confirm', startDriveImportReview],
    ['drive-import-apply-fast', confirmDriveImport],
    ['drive-import-review-next', driveImportReviewNext],
    ['drive-import-review-prev', driveImportReviewPrev],
    ['drive-import-back-paste', driveImportBackToPaste],
  ];
  actions.forEach(function (pair) {
    const btn = document.getElementById(pair[0]);
    const fn = pair[1];
    if (!btn || btn.dataset.driveImportActionWired) return;
    btn.dataset.driveImportActionWired = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      void Promise.resolve(fn()).catch(function (err) {
        console.error('[drive-import] action failed', pair[0], err);
        rt.showToast('No se pudo completar la acción de importación', 'error');
        setReviewImportBusy(false);
      });
    });
  });
}

export function wireDriveImportModal() {
  const ta = getTextarea();
  const bd = getBackdrop();
  wireDriveImportActionButtons();
  if (ta && !ta.dataset.driveImportWired) {
    ta.dataset.driveImportWired = '1';
    ta.addEventListener('input', onPasteInputChanged);
    ta.addEventListener('paste', function () {
      setTimeout(onPasteInputChanged, 0);
    });
  }
  document.querySelectorAll('input[name="drive-import-mode"]').forEach(function (el) {
    if (el.dataset.driveImportWired) return;
    el.dataset.driveImportWired = '1';
    el.addEventListener('change', function () {
      syncConfirmLabel();
      refreshPreview();
      if (_modalStep === 'paste' && _autoReviewPending) {
        if (_debounceId) clearTimeout(_debounceId);
        _debounceId = setTimeout(function () {
          _debounceId = null;
          tryAutoStartReview();
        }, 320);
      }
    });
  });
  if (bd && !bd.dataset.driveImportWired) {
    bd.dataset.driveImportWired = '1';
    bd.addEventListener('click', function (e) {
      if (e.target === bd) closeDriveImportModal();
    });
  }
}

export const windowHandlers = {
  openDriveImportModal,
  closeDriveImportModal,
  confirmDriveImport,
  startDriveImportReview,
  driveImportBackToPaste,
  driveImportReviewPrev,
  driveImportReviewNext,
};
