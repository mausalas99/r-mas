import { patients, saveState } from '../app-state.mjs';
import { touchClinicalSessionActivity } from '../clinical-access-runtime.mjs';
import { createMutationBuilder } from '../versioned-mutation.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import {
  isLanSessionConfiguredForRest,
  lanPushPatientVersioned,
  lanFetchHostPatientRow,
  touchPatientLanUpdatedAt,
  scheduleLiveSyncPush,
} from './lan-sync.mjs';
import { toClinicalHistoryText } from '../../../lib/historia-clinica/clinical-text.mjs';
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
import { removeLabsTextBlock } from './eventualidades-labs-timeline.mjs';
let _editingEntryId = null;
/** @type {Map<string, boolean>} */
const _dayOpenPrefs = new Map();
/** Pending labs-box prefill (doc-queue / navigate). */
let _pendingPrefillText = null;
/** @type {'note'|'labs'} */
let _composeMode = 'note';

/**
 * Queue text into labsText (merge) and show Labs timeline.
 * @param {string} text
 * @returns {boolean}
 */
export function queueEventualidadesPrefill(text) {
  var t = String(text || '').trim();
  if (!t) {
    _pendingPrefillText = null;
    return false;
  }
  _editingEntryId = null;
  _composeMode = 'labs';
  _pendingPrefillText = t;
  return true;
}

/**
 * Apply queued prefill by merging into labsText if the mount exists.
 * @param {HTMLElement|null} [mountEl]
 * @returns {boolean}
 */
export function applyEventualidadesPrefill(mountEl) {
  if (!_pendingPrefillText) return false;
  var mount =
    mountEl ||
    (typeof document !== 'undefined' ? document.getElementById('exp-pane-eventualidades') : null);
  if (!mount) return false;
  return fillLabsFromPending_(mount);
}

function fillLabsFromPending_(mountEl) {
  if (!_pendingPrefillText || !mountEl) return false;
  var pending = _pendingPrefillText;
  _pendingPrefillText = null;
  _composeMode = 'labs';
  var patient = activePatient();
  if (!patient) return false;
  void savePatientEventualidadesLabs(patient, pending, { mode: 'merge' }).then(function (out) {
    if (out && out.ok) renderEventualidadesPanel(mountEl);
  });
  return true;
}

/**
 * @param {'note'|'labs'} mode
 * @param {HTMLElement|null} [mountEl]
 */
function setComposeMode_(mode, mountEl) {
  var next = mode === 'labs' ? 'labs' : 'note';
  var changed = _composeMode !== next;
  _composeMode = next;
  var mount =
    mountEl ||
    (typeof document !== 'undefined' ? document.getElementById('exp-pane-eventualidades') : null);
  if (!mount) return;
  if (changed) {
    renderEventualidadesPanel(mount);
    return;
  }
  applyComposeModeDom_(mount, _composeMode);
}

/** Prefer Labs timeline (autosend / doc-queue) without rewriting text. */
export function selectEventualidadesLabsMode() {
  setComposeMode_('labs');
}

/**
 * @param {HTMLElement} mountEl
 * @param {'note'|'labs'} mode
 */
function applyComposeModeDom_(mountEl, mode) {
  var panel = mountEl.querySelector('.ev-panel');
  if (panel) panel.setAttribute('data-ev-view', mode);
  mountEl.querySelectorAll('.ev-mode-switch__tab[data-ev-mode]').forEach(function (btn) {
    var on = btn.getAttribute('data-ev-mode') === mode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  var switchEl = mountEl.querySelector('.ev-mode-switch');
  if (switchEl) switchEl.setAttribute('data-ev-mode', mode);
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
 * Guarda / fusiona el bloque de interpretación de labs (no crea entrada clínica).
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
  scheduleLiveSyncPush();
  import('../lan-mutation-registry.mjs').then(function (m) {
    m.lanMutationRegistry.dispatchLanMutation('eventualidades', patient.id);
  });
  if (!isLanSessionConfiguredForRest()) {
    return { ok: true };
  }
  void (async function () {
    try {
      const hostRow = await lanFetchHostPatientRow(patient.id);
      const mutation = createMutationBuilder('patient', patient.id)
        .captureBase(hostPatientMutationBase(patient, hostRow))
        .set('eventualidades', next)
        .build();
      const out = await lanPushPatientVersioned(patient.id, mutation);
      if (out && out.ok) {
        if (out.data) Object.assign(patient, out.data);
        else patient.eventualidades = next;
        saveState();
        return;
      }
      if (out && !out.ok && !out.conflict) {
        const msg =
          out.status === 401 || out.status === 403
            ? 'No se pudo autenticar con el host LAN. Revisa el código de equipo.'
            : 'No se pudo sincronizar la eventualidad con el host LAN.';
        rt.showToast(msg, 'error');
      }
    } catch {
      /* local copy already saved */
    }
  })();
  return { ok: true, lanDeferred: true };
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
    const labsDel = ev.target.closest('[data-ev-labs-delete]');
    if (labsDel) {
      const blockId = labsDel.getAttribute('data-ev-labs-delete');
      if (!blockId) return;
      if (!confirm('¿Eliminar esta interpretación de labs?')) return;
      void (async function () {
        const removed = removeLabsTextBlock(getEventualidadesLabsText(store), blockId);
        if (!removed.changed) return;
        const next = setEventualidadesLabsText(store, removed.labsText);
        const out = await persistEventualidades(patient, next);
        if (out && out.ok) {
          rt.showToast('Interpretación eliminada.', 'success');
          renderEventualidadesPanel(mountEl);
        }
      })();
      return;
    }
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

function wireEventualidadesComposeSwitcher(mountEl) {
  const switchEl = mountEl.querySelector('.ev-mode-switch');
  if (!switchEl || switchEl.dataset.evSwitchWired === '1') return;
  switchEl.dataset.evSwitchWired = '1';
  switchEl.addEventListener('click', function (ev) {
    const btn = ev.target.closest('.ev-mode-switch__tab[data-ev-mode]');
    if (!btn || btn.disabled || !switchEl.contains(btn)) return;
    const mode = btn.getAttribute('data-ev-mode') === 'labs' ? 'labs' : 'note';
    setComposeMode_(mode, mountEl);
    if (mode === 'note') {
      const focusEl = mountEl.querySelector('#eventualidades-input');
      if (focusEl && typeof focusEl.focus === 'function') {
        try {
          focusEl.focus();
        } catch {
          /* ignore */
        }
      }
    }
  });
}

function wireEventualidadesCompose(mountEl, patient, store) {
  wireEventualidadesComposeSwitcher(mountEl);
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
  if (_editingEntryId) _composeMode = 'note';
  const byDay = groupEntriesByDay(store.entries);
  const hasEntries = byDay.length > 0;
  const timelineMode = _editingEntryId ? 'note' : _composeMode;

  mountEl.innerHTML = buildEventualidadesPanelHtml(
    byDay,
    hasEntries,
    editingEntry,
    store,
    timelineMode,
    {
      editingEntryId: _editingEntryId,
      composeMode: _composeMode,
      dayOpenPrefs: _dayOpenPrefs,
    }
  );
  refreshRpcDateFields(mountEl);
  wireEventualidadesUppercase(mountEl.querySelector('#eventualidades-input'));
  wireEventualidadesDayToggles(mountEl);
  wireEventualidadesComposeSwitcher(mountEl);
  wireEventualidadesCompose(mountEl, patient, store);
  wireEventualidadesTimeline(mountEl, patient, store);
  applyComposeModeDom_(mountEl, _editingEntryId ? 'note' : _composeMode);
  fillLabsFromPending_(mountEl);
}

export function invalidateEventualidadesPanel() {
  _editingEntryId = null;
  _dayOpenPrefs.clear();
  _pendingPrefillText = null;
  _composeMode = 'note';
}

/** @type {number} */
export const DRIVE_IMPORT_LAN_MS = 8000;
