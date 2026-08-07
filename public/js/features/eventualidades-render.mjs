import { patients, saveState } from '../app-state.mjs';
import { touchClinicalSessionActivity } from '../clinical-access-runtime.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';

function touchPatientLanUpdatedAt(patientId) {
  const p = patients.find(function (row) {
    return String(row.id) === String(patientId);
  });
  if (p) p.lanUpdatedAt = new Date().toISOString();
}
import { toClinicalHistoryText } from '../../../lib/clinical-text.mjs';
import {
  rt,
  eventualidadDateToIso,
  appendEventualidad,
  updateEventualidad,
  findEventualidadEntry,
  removeEventualidad,
  groupEntriesByDay,
  getEventualidadesLabsText,
  setEventualidadesLabsText,
  mergeEventualidadesLabsText,
} from './eventualidades-store.mjs';
import { buildEventualidadesPanelHtml } from './eventualidades-panel-html.mjs';

let _editingEntryId = null;
/** @type {Map<string, boolean>} */
const _dayOpenPrefs = new Map();

/**
 * Prefill note compose (legacy: doc-queue used to target labsText).
 * @param {string} text
 * @returns {boolean}
 */
export function queueEventualidadesPrefill(text) {
  var t = String(text || '').trim();
  if (!t) return false;
  _editingEntryId = null;
  var mount =
    typeof document !== 'undefined' ? document.getElementById('exp-pane-eventualidades') : null;
  if (!mount) return false;
  var input = mount.querySelector('#eventualidades-input');
  if (!input) return false;
  input.value = toClinicalHistoryText(t);
  try {
    input.focus();
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * @param {HTMLElement|null} [mountEl]
 * @returns {boolean}
 */
export function applyEventualidadesPrefill(mountEl) {
  void mountEl;
  return false;
}

/** No-op: Labs tab removed from Eventualidades. */
export function selectEventualidadesLabsMode() {
  /* intentionally empty */
}

function wireEventualidadesUppercase(input) {
  if (!input || input.dataset.evUpperWired === '1') return;
  input.dataset.evUpperWired = '1';
  input.style.textTransform = 'uppercase';
  input.addEventListener('input', function () {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const upper = toClinicalHistoryText(input.value);
    if (upper !== input.value) {
      input.value = upper;
      if (start != null && end != null) {
        input.setSelectionRange(start, end);
      }
    }
  });
}

function activePatient() {
  const id = rt.getActiveId();
  if (!id) return null;
  return patients.find(function (p) {
    return String(p.id) === String(id);
  });
}

export function ensureEventualidades(patient) {
  if (!patient.eventualidades || typeof patient.eventualidades !== 'object') {
    patient.eventualidades = { entries: [], labsText: '' };
  }
  if (!Array.isArray(patient.eventualidades.entries)) {
    patient.eventualidades.entries = [];
  }
  if (patient.eventualidades.labsText == null) {
    patient.eventualidades.labsText = '';
  }
  return patient.eventualidades;
}

export function hostPatientMutationBase(patient, hostRow) {
  if (hostRow) return hostRow;
  return Object.assign({}, patient, { version: 0 });
}

/**
 * Append one eventualidad and persist locally + LAN when configured.
 * @param {object} patient
 * @param {string} text
 * @param {string} [atIso]
 * @returns {Promise<{ ok: boolean, reason?: string, lanDeferred?: boolean }>}
 */
export async function savePatientEventualidad(patient, text, atIso) {
  if (!patient) return { ok: false, reason: 'no-patient' };
  const store = ensureEventualidades(patient);
  const next = appendEventualidad(store, text, '', atIso);
  if (next.entries.length === store.entries.length) {
    return { ok: false, reason: 'empty' };
  }
  return persistEventualidades(patient, next);
}

/**
 * Persist labsText for sync compat (UI Labs tab removed — no auto-interpret).
 * @param {object} patient
 * @param {string} text
 * @param {{ mode?: 'set'|'merge' }} [opts]
 */
export async function savePatientEventualidadesLabs(patient, text, opts) {
  if (!patient) return { ok: false, reason: 'no-patient' };
  const store = ensureEventualidades(patient);
  const mode = opts && opts.mode === 'set' ? 'set' : 'merge';
  if (mode === 'set') {
    const next = setEventualidadesLabsText(store, text);
    if (next.labsText === getEventualidadesLabsText(store)) {
      return { ok: true, skipped: 'dup' };
    }
    return persistEventualidades(patient, next);
  }
  const merged = mergeEventualidadesLabsText(store, text);
  if (!merged.changed) return { ok: true, skipped: 'dup' };
  return persistEventualidades(patient, {
    entries: merged.entries,
    labsText: merged.labsText,
  });
}

async function persistEventualidades(patient, store) {
  const next =
    store && typeof store === 'object'
      ? Object.assign({}, store, {
          updatedAt: store.updatedAt || new Date().toISOString(),
        })
      : { entries: [], updatedAt: new Date().toISOString() };
  patient.eventualidades = next;
  touchPatientLanUpdatedAt(patient.id);
  await saveState({ immediate: true });
  touchClinicalSessionActivity({ force: true });
  // Nube: mutation registry is LAN-gated; scheduleLiveSyncPush routes to cloud outbox.
  scheduleCloudSyncPush();
  return { ok: true };
}

function wireEventualidadesDayToggles(mountEl) {
  mountEl.querySelectorAll('.ev-day').forEach(function (dayEl) {
    dayEl.addEventListener('toggle', function () {
      const key = dayEl.getAttribute('data-day');
      if (key) _dayOpenPrefs.set(key, dayEl.open);
    });
  });
}

function deleteConfirmMessage(row) {
  const preview = row
    ? String(row.text || '')
        .trim()
        .slice(0, 80)
    : '';
  if (!preview) return '¿Eliminar esta eventualidad?';
  return (
    '¿Eliminar esta eventualidad?\n\n“' + preview + (preview.length >= 80 ? '…' : '') + '”'
  );
}

function wireEventualidadesTimeline(mountEl, patient, store) {
  const timeline = mountEl.querySelector('.ev-timeline');
  if (!timeline) return;
  timeline.addEventListener('click', function (ev) {
    const delBtn = ev.target.closest('[data-ev-delete]');
    if (delBtn) {
      const delId = delBtn.getAttribute('data-ev-delete');
      if (!delId) return;
      const row = findEventualidadEntry(store, delId);
      if (!confirm(deleteConfirmMessage(row))) return;
      void (async function () {
        const next = removeEventualidad(store, delId);
        if (_editingEntryId === delId) _editingEntryId = null;
        const out = await persistEventualidades(patient, next);
        if (out && out.ok) {
          rt.showToast('Eventualidad eliminada.', 'success');
          renderEventualidadesPanel(mountEl);
        }
      })();
      return;
    }
    const btn = ev.target.closest('[data-ev-edit]');
    if (!btn) return;
    const id = btn.getAttribute('data-ev-edit');
    if (!id) return;
    _editingEntryId = id;
    renderEventualidadesPanel(mountEl);
    const compose = mountEl.querySelector('.ev-compose');
    if (compose && compose.scrollIntoView) {
      compose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

function wireEventualidadesCompose(mountEl, patient, store) {
  const addBtn = mountEl.querySelector('#eventualidades-add');
  const input = mountEl.querySelector('#eventualidades-input');
  const atInput = mountEl.querySelector('#eventualidades-at');
  const cancelBtn = mountEl.querySelector('#eventualidades-cancel');
  if (!addBtn || !input || !atInput) return;

  function readAtIso() {
    return eventualidadDateToIso(atInput.value);
  }

  async function submitEntry() {
    const text = input.value;
    const atIso = readAtIso();
    let next;
    if (_editingEntryId) {
      next = updateEventualidad(store, _editingEntryId, { text: text, at: atIso });
    } else {
      next = appendEventualidad(store, text, '', atIso);
    }
    const out = await persistEventualidades(patient, next);
    if (out && out.ok) {
      const wasEdit = !!_editingEntryId;
      _editingEntryId = null;
      rt.showToast(wasEdit ? 'Eventualidad actualizada.' : 'Eventualidad guardada.', 'success');
      renderEventualidadesPanel(mountEl);
    }
  }

  addBtn.onclick = function () {
    void submitEntry();
  };

  if (cancelBtn) {
    cancelBtn.onclick = function () {
      _editingEntryId = null;
      renderEventualidadesPanel(mountEl);
    };
  }

  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void submitEntry();
    }
    if (ev.key === 'Escape' && _editingEntryId) {
      ev.preventDefault();
      _editingEntryId = null;
      renderEventualidadesPanel(mountEl);
    }
  });
}

export function renderEventualidadesPanel(mountEl) {
  if (!mountEl) return;
  const patient = activePatient();
  if (!patient) {
    mountEl.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  const store = ensureEventualidades(patient);
  const editingEntry = _editingEntryId ? findEventualidadEntry(store, _editingEntryId) : null;
  if (_editingEntryId && !editingEntry) _editingEntryId = null;
  const byDay = groupEntriesByDay(store.entries);
  const hasEntries = byDay.length > 0;

  mountEl.innerHTML = buildEventualidadesPanelHtml(
    byDay,
    hasEntries,
    editingEntry,
    store,
    'note',
    {
      editingEntryId: _editingEntryId,
      composeMode: 'note',
      dayOpenPrefs: _dayOpenPrefs,
    }
  );
  refreshRpcDateFields(mountEl);
  wireEventualidadesUppercase(mountEl.querySelector('#eventualidades-input'));
  wireEventualidadesDayToggles(mountEl);
  wireEventualidadesCompose(mountEl, patient, store);
  wireEventualidadesTimeline(mountEl, patient, store);
}

export function invalidateEventualidadesPanel() {
  _editingEntryId = null;
  _dayOpenPrefs.clear();
}

/** @type {number} */
export const DRIVE_IMPORT_LAN_MS = 8000;
