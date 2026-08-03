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
  normalizeEventualidadText,
  toEventualidadDateValue,
  eventualidadDateToIso,
  appendEventualidad,
  updateEventualidad,
  findEventualidadEntry,
  removeEventualidad,
  formatDaySubLabel,
  groupEntriesByDay,
  getEventualidadesLabsText,
  setEventualidadesLabsText,
  mergeEventualidadesLabsText,
} from './eventualidades-store.mjs';
import {
  renderEventualidadesLabsPane,
  wireEventualidadesLabsBox,
  fillEventualidadesLabsInput,
} from './eventualidades-labs-ui.mjs';

import { esc } from '../dom-escape.mjs';
let _editingEntryId = null;
/** @type {Map<string, boolean>} */
const _dayOpenPrefs = new Map();
/** Pending labs-box prefill (doc-queue / navigate). */
let _pendingPrefillText = null;
/** @type {'note'|'labs'} */
let _composeMode = 'note';

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
  return fillEventualidadesLabsInput(mountEl, pending, setComposeMode_);
}

/**
 * @param {'note'|'labs'} mode
 * @param {HTMLElement|null} [mountEl]
 */
function setComposeMode_(mode, mountEl) {
  _composeMode = mode === 'labs' ? 'labs' : 'note';
  var mount =
    mountEl ||
    (typeof document !== 'undefined' ? document.getElementById('exp-pane-eventualidades') : null);
  if (!mount) return;
  applyComposeModeDom_(mount, _composeMode);
}

/** Prefer Labs pane (autosend / doc-queue) without rewriting text. */
export function selectEventualidadesLabsMode() {
  setComposeMode_('labs');
}

/**
 * @param {HTMLElement} mountEl
 * @param {'note'|'labs'} mode
 */
function applyComposeModeDom_(mountEl, mode) {
  var dock = mountEl.querySelector('.ev-compose');
  if (!dock) return;
  dock.setAttribute('data-ev-mode', mode);
  dock.querySelectorAll('.ev-compose__tab[data-ev-mode]').forEach(function (btn) {
    var on = btn.getAttribute('data-ev-mode') === mode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  dock.querySelectorAll('[data-ev-pane]').forEach(function (pane) {
    var on = pane.getAttribute('data-ev-pane') === mode;
    pane.hidden = !on;
    pane.classList.toggle('ev-compose__pane--active', on);
  });
}

function daySectionIsOpen(dayGroup, editingId) {
  if (_dayOpenPrefs.has(dayGroup.day)) return _dayOpenPrefs.get(dayGroup.day);
  if (dayGroup.isToday) return true;
  if (
    editingId &&
    dayGroup.entries.some(function (e) {
      return e && String(e.id) === String(editingId);
    })
  ) {
    return true;
  }
  return false;
}

function renderEntryCard(entry, editingId) {
  const isEditing = editingId && String(entry.id) === String(editingId);
  return (
    '<article class="ev-card' +
    (isEditing ? ' ev-card--editing' : '') +
    '" data-entry-id="' +
    esc(entry.id) +
    '">' +
    '<p class="ev-card__text">' +
    esc(normalizeEventualidadText(entry.text)) +
    '</p>' +
    '<footer class="ev-card__foot">' +
    '<div class="ev-card__actions">' +
    '<button type="button" class="ev-card__edit" data-ev-edit="' +
    esc(entry.id) +
    '" aria-label="Editar eventualidad">Editar</button>' +
    '<button type="button" class="ev-card__delete" data-ev-delete="' +
    esc(entry.id) +
    '" aria-label="Eliminar eventualidad">Eliminar</button>' +
    '</div></footer>' +
    '</article>'
  );
}

function renderDaySection(dayGroup, editingId, now) {
  const n = dayGroup.entries.length;
  const countLabel = n === 1 ? '1 registro' : n + ' registros';
  const subLabel = formatDaySubLabel(dayGroup.day, now);
  const todayClass = dayGroup.isToday ? ' ev-day--today' : '';
  const isOpen = daySectionIsOpen(dayGroup, editingId);
  return (
    '<details class="ev-day' +
    todayClass +
    '"' +
    (isOpen ? ' open' : '') +
    ' data-day="' +
    esc(dayGroup.day) +
    '">' +
    '<summary class="ev-day__summary">' +
    '<span class="ev-day__chevron" aria-hidden="true"></span>' +
    '<div class="ev-day__titles">' +
    '<span class="ev-day__pill">' +
    esc(dayGroup.label) +
    '</span>' +
    (subLabel ? '<span class="ev-day__date">' + esc(subLabel) + '</span>' : '') +
    '</div>' +
    '<span class="ev-day__count">' +
    esc(countLabel) +
    '</span>' +
    '</summary>' +
    '<div class="ev-day__panel">' +
    dayGroup.entries
      .map(function (e) {
        return renderEntryCard(e, editingId);
      })
      .join('') +
    '</div></details>'
  );
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

function renderComposeSwitcher(mode, isEdit) {
  const active = isEdit ? 'note' : mode;
  return (
    '<div class="ev-compose__switch" role="tablist" aria-label="Tipo de registro">' +
    '<span class="ev-compose__switch-pill" aria-hidden="true"></span>' +
    '<button type="button" class="ev-compose__tab' +
    (active === 'note' ? ' active' : '') +
    '" role="tab" data-ev-mode="note" aria-selected="' +
    (active === 'note' ? 'true' : 'false') +
    '">Eventualidad</button>' +
    '<button type="button" class="ev-compose__tab' +
    (active === 'labs' ? ' active' : '') +
    '" role="tab" data-ev-mode="labs" aria-selected="' +
    (active === 'labs' ? 'true' : 'false') +
    '"' +
    (isEdit ? ' disabled title="Termina la edición para cambiar a Labs"' : '') +
    '>Labs</button>' +
    '</div>'
  );
}

function renderNotePane(editingEntry) {
  const isEdit = !!editingEntry;
  const atValue = isEdit
    ? toEventualidadDateValue(editingEntry.at)
    : toEventualidadDateValue(new Date());
  const textValue = isEdit ? String(editingEntry.text || '') : '';
  return (
    '<div class="ev-compose__pane" data-ev-pane="note"' +
    (isEdit || _composeMode !== 'labs' ? '' : ' hidden') +
    '>' +
    '<div class="ev-compose__top">' +
    '<label class="ev-compose__label" for="eventualidades-input">' +
    (isEdit ? 'Editar eventualidad' : 'Nueva eventualidad') +
    '</label>' +
    '<div class="ev-compose__date-slot">' +
    '<input type="date" id="eventualidades-at" class="rpc-date-input" value="' +
    esc(atValue) +
    '" title="Fecha de la eventualidad" aria-label="Fecha de la eventualidad">' +
    '</div></div>' +
    '<textarea id="eventualidades-input" class="ev-compose__input" rows="2" placeholder="Describe lo ocurrido…">' +
    esc(textValue) +
    '</textarea>' +
    '<div class="ev-compose__actions">' +
    '<span class="ev-compose__hint">' +
    (isEdit ? 'Puedes cambiar la fecha y el texto' : 'Elige una fecha anterior si aplica') +
    '</span>' +
    '<div class="ev-compose__btns">' +
    (isEdit
      ? '<button type="button" class="ea-btn ea-btn--ghost ev-compose__cancel" id="eventualidades-cancel">Cancelar</button>'
      : '') +
    '<button type="button" class="ea-btn ea-btn--primary ev-compose__submit" id="eventualidades-add">' +
    (isEdit ? 'Guardar' : 'Agregar') +
    '</button>' +
    '</div></div></div>'
  );
}

function renderComposeBlock(editingEntry, store) {
  const isEdit = !!editingEntry;
  const mode = isEdit ? 'note' : _composeMode;
  return (
    '<footer class="ev-compose" data-ev-mode="' +
    esc(mode) +
    '">' +
    '<div class="ev-compose__card' +
    (isEdit ? ' ev-compose__card--edit' : '') +
    '">' +
    renderComposeSwitcher(mode, isEdit) +
    renderNotePane(editingEntry) +
    '<div class="ev-compose__pane" data-ev-pane="labs"' +
    (mode === 'labs' ? '' : ' hidden') +
    '>' +
    renderEventualidadesLabsPane(store) +
    '</div></div></footer>'
  );
}

function activePatient() {
  const id = rt.getActiveId();
  if (!id) return null;
  return patients.find(function (p) {
    return String(p.id) === String(id);
  });
}

function buildEventualidadesPanelHtml(byDay, hasEntries, editingEntry, store) {
  return (
    '<div class="ev-panel">' +
    '<header class="ev-panel__head">' +
    '<p class="ev-panel__hint">Bitácora cronológica de la hospitalización, agrupada por día.</p>' +
    '</header>' +
    '<div class="ev-timeline' +
    (hasEntries ? '' : ' ev-timeline--empty') +
    '" role="feed" aria-label="Eventualidades por día">' +
    (hasEntries
      ? '<div class="ev-timeline__days">' +
        byDay
          .map(function (day) {
            return renderDaySection(day, _editingEntryId, new Date());
          })
          .join('') +
        '</div>'
      : '<p class="ev-empty">Aún no hay eventualidades. Usa el switcher de abajo: Eventualidad o Labs.</p>') +
    '</div>' +
    renderComposeBlock(editingEntry, store) +
    '</div>'
  );
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
  const switchEl = mountEl.querySelector('.ev-compose__switch');
  if (!switchEl || switchEl.dataset.evSwitchWired === '1') return;
  switchEl.dataset.evSwitchWired = '1';
  switchEl.addEventListener('click', function (ev) {
    const btn = ev.target.closest('.ev-compose__tab[data-ev-mode]');
    if (!btn || btn.disabled || !switchEl.contains(btn)) return;
    const mode = btn.getAttribute('data-ev-mode') === 'labs' ? 'labs' : 'note';
    setComposeMode_(mode, mountEl);
    const focusId = mode === 'labs' ? '#eventualidades-labs' : '#eventualidades-input';
    const focusEl = mountEl.querySelector(focusId);
    if (focusEl && typeof focusEl.focus === 'function') {
      try {
        focusEl.focus();
      } catch {
        /* ignore */
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

  mountEl.innerHTML = buildEventualidadesPanelHtml(byDay, hasEntries, editingEntry, store);
  refreshRpcDateFields(mountEl);
  wireEventualidadesUppercase(mountEl.querySelector('#eventualidades-input'));
  wireEventualidadesDayToggles(mountEl);
  wireEventualidadesLabsBox(mountEl, function (next) {
    return persistEventualidades(patient, next);
  }, patient, store);
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
