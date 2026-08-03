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
import {
  wireEventualidadesLabsBox,
  fillEventualidadesLabsInput,
} from './eventualidades-labs-ui.mjs';
import {
  buildEventualidadesPanelHtml,
  buildEventualidadesComposeHtml,
} from './eventualidades-panel-html.mjs';
import {
  openEventualidadComposeSheet,
  closeEventualidadComposeSheet,
  isEventualidadComposeSheetOpen,
} from './eventualidades-sheet.mjs';

let _editingEntryId = null;
/** @type {Map<string, boolean>} */
const _dayOpenPrefs = new Map();
/** Pending labs-box prefill (doc-queue / navigate). */
let _pendingPrefillText = null;
/** @type {'note'|'labs'} */
let _composeMode = 'note';
/** @type {HTMLElement|null} */
let _panelMountEl = null;

/**
 * Queue text into the labs interpretation box (mismo registro Eventualidades).
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
 * Apply queued prefill into the labs box if the mount exists.
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
  openComposeSheet_(mountEl, 'labs');
  var sheetMount = document.querySelector('.ev-sheet__body');
  if (!sheetMount) return false;
  return fillEventualidadesLabsInput(sheetMount, pending, applyComposeModeInSheet_);
}

/**
 * @param {'note'|'labs'} mode
 * @param {HTMLElement|null} [mountEl]
 */
function setComposeMode_(mode, mountEl) {
  var next = mode === 'labs' ? 'labs' : 'note';
  _composeMode = next;
  var mount =
    mountEl ||
    _panelMountEl ||
    (typeof document !== 'undefined' ? document.getElementById('exp-pane-eventualidades') : null);
  if (!mount) return;
  if (isEventualidadComposeSheetOpen()) {
    applyComposeModeInSheet_(next);
    return;
  }
  openComposeSheet_(mount, next);
}

function applyComposeModeInSheet_(mode) {
  var root = document.querySelector('.ev-compose--sheet');
  if (!root) return;
  root.setAttribute('data-ev-mode', mode);
  root.querySelectorAll('.ev-compose__tab[data-ev-mode]').forEach(function (btn) {
    var on = btn.getAttribute('data-ev-mode') === mode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  root.querySelectorAll('[data-ev-pane]').forEach(function (pane) {
    var on = pane.getAttribute('data-ev-pane') === mode;
    pane.hidden = !on;
    pane.classList.toggle('ev-compose__pane--active', on);
  });
  var focusId = mode === 'labs' ? '#eventualidades-labs' : '#eventualidades-input';
  var focusEl = root.querySelector(focusId);
  if (focusEl && typeof focusEl.focus === 'function') {
    try {
      focusEl.focus();
    } catch {
      /* ignore */
    }
  }
}

/** Prefer Labs pane (autosend / doc-queue) without rewriting text. */
export function selectEventualidadesLabsMode() {
  setComposeMode_('labs');
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
    '¿Eliminar esta eventualidad?\n\n"' + preview + (preview.length >= 80 ? '…' : '') + '"'
  );
}

function composeSheetAriaLabel_(editingEntry, mode) {
  if (editingEntry) return 'Editar eventualidad';
  return mode === 'labs' ? 'Interpretación de laboratorios' : 'Nueva eventualidad';
}

function closeComposeAndRefresh_(panelMount, reason) {
  closeEventualidadComposeSheet(reason);
  if (panelMount) renderEventualidadesPanel(panelMount);
}

function openComposeSheet_(panelMount, mode) {
  const patient = activePatient();
  if (!patient || !panelMount) return;
  const store = ensureEventualidades(patient);
  const editingEntry = _editingEntryId ? findEventualidadEntry(store, _editingEntryId) : null;
  if (_editingEntryId && !editingEntry) _editingEntryId = null;
  const composeMode = _editingEntryId ? 'note' : mode || _composeMode;
  _composeMode = composeMode;

  const sheet = openEventualidadComposeSheet({
    panelHtml: buildEventualidadesComposeHtml(editingEntry, store, composeMode),
    ariaLabel: composeSheetAriaLabel_(editingEntry, composeMode),
    onClose: function () {
      _editingEntryId = null;
      _composeMode = 'note';
      renderEventualidadesPanel(panelMount);
    },
  });

  wireComposeInMount_(sheet.mountEl, panelMount, patient, store);
}

function wireComposeInMount_(mountEl, panelMount, patient, store) {
  if (!mountEl) return;
  refreshRpcDateFields(mountEl);
  wireEventualidadesUppercase(mountEl.querySelector('#eventualidades-input'));
  wireEventualidadesLabsBox(mountEl, function (next) {
    return persistEventualidades(patient, next);
  }, patient, store);
  wireEventualidadesComposeSwitcher(mountEl);
  wireEventualidadesCompose(mountEl, panelMount, patient, store);
  applyComposeModeInSheet_(_editingEntryId ? 'note' : _composeMode);
}

function wireEventualidadesPanelActions(mountEl) {
  const actions = mountEl.querySelector('.ev-actions');
  if (!actions || actions.dataset.evActionsWired === '1') return;
  actions.dataset.evActionsWired = '1';
  actions.addEventListener('click', function (ev) {
    const btn = ev.target.closest('[data-ev-open-compose]');
    if (!btn || !actions.contains(btn)) return;
    _editingEntryId = null;
    const mode = btn.getAttribute('data-ev-open-compose') === 'labs' ? 'labs' : 'note';
    _composeMode = mode;
    openComposeSheet_(mountEl, mode);
  });
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
        if (_editingEntryId === delId) {
          _editingEntryId = null;
          closeEventualidadComposeSheet('delete');
        }
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
    _composeMode = 'note';
    openComposeSheet_(mountEl, 'note');
  });
}

function wireEventualidadesComposeSwitcher(mountEl) {
  const switchEl = mountEl.querySelector('.ev-compose__switch');
  if (!switchEl || switchEl.dataset.evSwitchWired === '1') return;
  switchEl.dataset.evSwitchWired = '1';
  switchEl.addEventListener('click', function (ev) {
    const btn = ev.target.closest('.ev-compose__tab[data-ev-mode]');
    if (!btn || btn.disabled || !switchEl.contains(btn)) return;
    const mode = btn.getAttribute('data-ev-mode') === 'labs' ? 'labs' : 'note';
    _composeMode = mode;
    applyComposeModeInSheet_(mode);
  });
}

function wireEventualidadesCompose(mountEl, panelMount, patient, store) {
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
      closeComposeAndRefresh_(panelMount, 'saved');
    }
  }

  addBtn.onclick = function () {
    void submitEntry();
  };

  if (cancelBtn) {
    cancelBtn.onclick = function () {
      _editingEntryId = null;
      closeComposeAndRefresh_(panelMount, 'cancel');
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
      closeComposeAndRefresh_(panelMount, 'escape');
    }
  });
}

export function renderEventualidadesPanel(mountEl) {
  if (!mountEl) return;
  _panelMountEl = mountEl;
  const patient = activePatient();
  if (!patient) {
    closeEventualidadComposeSheet('no-patient');
    mountEl.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  const store = ensureEventualidades(patient);
  if (_editingEntryId && !findEventualidadEntry(store, _editingEntryId)) {
    _editingEntryId = null;
    closeEventualidadComposeSheet('stale-edit');
  }
  const byDay = groupEntriesByDay(store.entries);
  const hasEntries = byDay.length > 0;

  mountEl.innerHTML = buildEventualidadesPanelHtml(byDay, hasEntries, {
    editingEntryId: _editingEntryId,
    dayOpenPrefs: _dayOpenPrefs,
  });
  wireEventualidadesDayToggles(mountEl);
  wireEventualidadesPanelActions(mountEl);
  wireEventualidadesTimeline(mountEl, patient, store);

  if (_pendingPrefillText) {
    fillLabsFromPending_(mountEl);
    return;
  }
  if (_editingEntryId && !isEventualidadComposeSheetOpen()) {
    openComposeSheet_(mountEl, 'note');
  }
}

export function invalidateEventualidadesPanel() {
  _editingEntryId = null;
  _dayOpenPrefs.clear();
  _pendingPrefillText = null;
  _composeMode = 'note';
  closeEventualidadComposeSheet('invalidate');
}

/** @type {number} */
export const DRIVE_IMPORT_LAN_MS = 8000;
