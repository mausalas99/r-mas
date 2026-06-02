import { parseDriveDocument, listProfiles } from '../../../lib/drive-import/parse-drive-document.mjs';
import { applyDriveImport } from './drive-import-apply.mjs';

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
let _profilesPopulated = false;

export function registerDriveImportRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

function getBackdrop() {
  return document.getElementById('drive-import-backdrop');
}

function getTextarea() {
  return /** @type {HTMLTextAreaElement | null} */ (document.getElementById('drive-import-input'));
}

function getProfileSelect() {
  return /** @type {HTMLSelectElement | null} */ (document.getElementById('drive-import-profile'));
}

function getPreviewEl() {
  return document.getElementById('drive-import-preview');
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

function populateProfileSelect(selectedId) {
  const sel = getProfileSelect();
  if (!sel) return;
  if (!_profilesPopulated) {
    sel.innerHTML = '';
    listProfiles().forEach(function (p) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      sel.appendChild(opt);
    });
    _profilesPopulated = true;
  }
  if (selectedId) sel.value = selectedId;
}

function getParsed() {
  const ta = getTextarea();
  const sel = getProfileSelect();
  const patient = rt.getActivePatient();
  const existing = patient && patient.eventualidades && Array.isArray(patient.eventualidades.entries)
    ? patient.eventualidades.entries
    : [];
  return parseDriveDocument(ta ? ta.value : '', sel ? sel.value : undefined, {
    existingEventualidades: existing,
  });
}

function refreshPreview() {
  const preview = getPreviewEl();
  const warn = getWarningEl();
  const confirmBtn = document.getElementById('drive-import-confirm');
  if (!preview) return;

  const ta = getTextarea();
  if (!ta || !String(ta.value || '').trim()) {
    preview.textContent = 'Pega el documento de Drive para ver la vista previa.';
    if (warn) warn.hidden = true;
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  let parsed;
  try {
    parsed = getParsed();
  } catch (err) {
    preview.textContent = 'Error al analizar: ' + (err && err.message ? err.message : String(err));
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  populateProfileSelect(parsed.profileId);
  preview.textContent = parsed.previewText || '';

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

  const hasHc = Object.keys(parsed.hcPatch || {}).some(function (k) {
    return !String(k).startsWith('_');
  });
  const hasEv = (parsed.eventualidades.entries || []).length > 0;
  if (confirmBtn) confirmBtn.disabled = !hasHc && !hasEv;
}

function syncConfirmLabel() {
  const btn = document.getElementById('drive-import-confirm');
  const modeFs = document.getElementById('drive-import-mode-fieldset');
  const patient = rt.getActivePatient();
  if (modeFs) modeFs.style.display = patient ? '' : 'none';
  if (!btn) return;
  btn.textContent = patient
    ? 'Aplicar a ' + (patient.nombre || 'paciente')
    : 'Crear paciente e importar';
}

export function openDriveImportModal() {
  const bd = getBackdrop();
  if (!bd) {
    rt.showToast('Importación desde Drive no disponible', 'error');
    return;
  }
  const ta = getTextarea();
  if (ta) ta.value = '';
  _profilesPopulated = false;
  populateProfileSelect('drive-pipe-hc-v1');
  syncConfirmLabel();
  refreshPreview();
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  if (ta) ta.focus();
}

export function closeDriveImportModal() {
  const bd = getBackdrop();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

export async function confirmDriveImport() {
  const ta = getTextarea();
  if (!ta || !String(ta.value || '').trim()) {
    rt.showToast('Pega el contenido del documento', 'error');
    return;
  }

  let parsed;
  try {
    parsed = getParsed();
  } catch (err) {
    rt.showToast('No se pudo analizar el texto', 'error');
    return;
  }

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
      !confirm(
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

  if (mode === 'replace') {
    if (!confirm('Se sobrescribirán las secciones de Historia clínica presentes en el documento. ¿Continuar?')) {
      return;
    }
  }

  if (createNew && (!parsed.header || !parsed.header.nombre)) {
    if (!confirm('No se detectó nombre en el encabezado. ¿Crear paciente igualmente?')) {
      return;
    }
  }

  if (typeof rt.pushUndoSnapshot === 'function') {
    rt.pushUndoSnapshot('Importar desde Drive');
  }

  const result = await applyDriveImport(parsed, {
    mode: mode,
    activePatient: patient,
    createNew: createNew,
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
        profileId: parsed.profileId,
        mode: mode,
        skipped: result.evSkipped,
        createNew: createNew,
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
    parts.push(result.evSkipped + ' duplicada' + (result.evSkipped === 1 ? '' : 's') + ' omitida' + (result.evSkipped === 1 ? '' : 's'));
  }
  rt.showToast(parts.join(' · '), 'success');

  if (typeof rt.switchAppTab === 'function') rt.switchAppTab('clinico');
  if (typeof rt.switchInnerTab === 'function') rt.switchInnerTab(result.navigateTo || 'historia');
}

export function wireDriveImportModal() {
  const ta = getTextarea();
  const sel = getProfileSelect();
  const bd = getBackdrop();
  if (ta && !ta.dataset.driveImportWired) {
    ta.dataset.driveImportWired = '1';
    ta.addEventListener('input', function () {
      if (_debounceId) clearTimeout(_debounceId);
      _debounceId = setTimeout(refreshPreview, 200);
    });
  }
  if (sel && !sel.dataset.driveImportWired) {
    sel.dataset.driveImportWired = '1';
    sel.addEventListener('change', refreshPreview);
  }
  document.querySelectorAll('input[name="drive-import-mode"]').forEach(function (el) {
    if (el.dataset.driveImportWired) return;
    el.dataset.driveImportWired = '1';
    el.addEventListener('change', syncConfirmLabel);
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
};
