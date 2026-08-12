import { getPatients, persistClinicalState } from '../app-state.mjs';
import { touchClinicalSessionActivity } from '../clinical-access-runtime.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import {
  isClinicalRepoEventualidadesEnabled,
  isClinicalRepoSyncProjectorEnabled,
} from '../clinical-repo-flag.mjs';
import { canExecuteClinicalCommand, executeClinicalCommand } from '../clinical-repo-client.mjs';
import { drainClinicalSyncProjector } from '../clinical-repo-sync-drain.mjs';
import { _applyPatientPatch } from '../clinical-read-model.mjs';
import { tendenciasBridge } from './tendencias-bridge.mjs';

function touchPatientLanUpdatedAt(patientId) {
  const p = getPatients().find(function (row) {
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
let _eventualidadesPanelGen = 0;
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
  return getPatients().find(function (p) {
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
 * @param {string} [kind]
 * @param {string} [transfusionProduct]
 * @returns {Promise<{ ok: boolean, reason?: string, lanDeferred?: boolean }>}
 */
export async function savePatientEventualidad(patient, text, atIso, kind, transfusionProduct) {
  if (!patient) return { ok: false, reason: 'no-patient' };
  const store = ensureEventualidades(patient);
  const next = appendEventualidad(store, text, '', atIso, kind, transfusionProduct);
  if (next.entries.length === store.entries.length) {
    return { ok: false, reason: 'empty' };
  }
  const added = next.entries[next.entries.length - 1];
  return persistEventualidades(patient, next, {
    type: 'eventualidad.upsert',
    patientId: String(patient.id || ''),
    entry: {
      id: added && added.id,
      text: added && added.text,
      at: added && added.at,
      kind: added && added.kind,
      transfusionProduct: added && added.transfusionProduct,
    },
  });
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
    return persistEventualidades(patient, next, {
      type: 'eventualidades.labs.set',
      patientId: String(patient.id || ''),
      text: next.labsText,
    });
  }
  const merged = mergeEventualidadesLabsText(store, text);
  if (!merged.changed) return { ok: true, skipped: 'dup' };
  return persistEventualidades(
    patient,
    {
      entries: merged.entries,
      labsText: merged.labsText,
    },
    {
      type: 'eventualidades.labs.merge',
      patientId: String(patient.id || ''),
      text: text,
    }
  );
}

/**
 * @param {object} patient
 * @param {object} store
 * @param {{ type: string } & Record<string, unknown> | null} [command]
 */

function normalizeEventualidadesStore(store) {
  if (store && typeof store === 'object') {
    return Object.assign({}, store, {
      updatedAt: store.updatedAt || new Date().toISOString(),
    });
  }
  return { entries: [], updatedAt: new Date().toISOString() };
}

function refreshTendenciasAfterEventualidades() {
  if (
    typeof document !== 'undefined' &&
    document.getElementById('tendencias-container') &&
    document.getElementById('tendencias-container').querySelector('.tend-grid') &&
    typeof tendenciasBridge.renderTendencias === 'function'
  ) {
    tendenciasBridge.renderTendencias();
  }
}

function shouldPersistViaClinicalRepo(command) {
  return !!(
    isClinicalRepoEventualidadesEnabled() &&
    canExecuteClinicalCommand() &&
    command &&
    typeof command === 'object' &&
    command.type
  );
}

function mergeCommandPatientsIntoAppState(patientsArr, patientId, fallbackStore) {
  if (!Array.isArray(patientsArr)) return fallbackStore;
  const id = String(patientId || '').trim();
  const live = getPatients();
  let mergedStore = fallbackStore;
  for (let i = 0; i < patientsArr.length; i += 1) {
    const row = patientsArr[i];
    if (!row || String(row.id) !== id) continue;
    const idx = live.findIndex(function (p) {
      return p && String(p.id) === id;
    });
    if (idx >= 0) {
      // Keep the live object identity (UI closures) but take DB eventualidades.
      live[idx].eventualidades = row.eventualidades;
      if (row.lanUpdatedAt) live[idx].lanUpdatedAt = row.lanUpdatedAt;
      mergedStore = row.eventualidades || fallbackStore;
    }
    break;
  }
  return mergedStore;
}

function eventualidadesMountEl(preferred) {
  if (preferred && preferred.isConnected) return preferred;
  return typeof document !== 'undefined'
    ? document.getElementById('exp-pane-eventualidades')
    : preferred;
}

function refreshEventualidadesPanelAfterPersist(preferred) {
  _eventualidadesPanelGen += 1;
  const gen = _eventualidadesPanelGen;
  const mount = eventualidadesMountEl(preferred);
  renderEventualidadesPanel(mount);
  void import('./pase-board-inner-cache.mjs')
    .then(function (m) {
      if (gen !== _eventualidadesPanelGen) return;
      if (m && typeof m.invalidateInnerTabRenderCache === 'function') {
        m.invalidateInnerTabRenderCache('eventualidades');
      }
      // Second paint against the live node — covers remounts during IPC/drain.
      if (gen === _eventualidadesPanelGen) {
        renderEventualidadesPanel(eventualidadesMountEl(mount));
      }
    })
    .catch(function () {});
}

async function executeEventualidadesCommandWithRetry(command) {
  let res = await executeClinicalCommand(command, { source: 'ui' });
  if (res && res.ok) return res;
  const reason = String((res && res.error) || '');
  // Census often lands in RAM via Nube before SQLCipher blob catch-up.
  if (reason === 'patient_not_found') {
    await persistClinicalState({ immediate: true });
    res = await executeClinicalCommand(command, { source: 'ui' });
  }
  return res;
}

export async function persistEventualidades(patient, store, command) {
  const next = normalizeEventualidadesStore(store);

  if (shouldPersistViaClinicalRepo(command)) {
    const res = await executeEventualidadesCommandWithRetry(command);
    if (!res || !res.ok) {
      return { ok: false, reason: (res && res.error) || 'repo_failed' };
    }
    const authoritative = mergeCommandPatientsIntoAppState(
      res.patients,
      patient && patient.id,
      next
    );
    patient.eventualidades = authoritative;
    _applyPatientPatch(
      patient.id,
      { eventualidades: authoritative },
      patient,
      { source: 'eventualidades-persist' }
    );
    touchPatientLanUpdatedAt(patient.id);
    touchClinicalSessionActivity({ force: true });
    // Do not await projector/push before UI returns — a concurrent pull can
    // remount the pane from stale cloud state and look like "needs patient switch".
    if (isClinicalRepoSyncProjectorEnabled()) {
      void drainClinicalSyncProjector().catch(function (err) {
        console.warn('[eventualidades] sync projector failed', err);
        scheduleCloudSyncPush();
      });
    } else {
      scheduleCloudSyncPush();
    }
    refreshTendenciasAfterEventualidades();
    return { ok: true, via: 'clinical-repo', changeId: res.changeId || null };
  }

  patient.eventualidades = next;
  touchPatientLanUpdatedAt(patient.id);
  await persistClinicalState({ immediate: true });
  touchClinicalSessionActivity({ force: true });
  // Nube: mutation registry routes clinical writes to the cloud outbox.
  scheduleCloudSyncPush();
  refreshTendenciasAfterEventualidades();
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
        const livePatient = activePatient() || patient;
        const liveStore = ensureEventualidades(livePatient);
        const next = removeEventualidad(liveStore, delId);
        if (_editingEntryId === delId) _editingEntryId = null;
        // Optimistic UI: drop the card immediately, then confirm via repo.
        livePatient.eventualidades = next;
        refreshEventualidadesPanelAfterPersist(mountEl);
        const out = await persistEventualidades(livePatient, next, {
          type: 'eventualidad.delete',
          patientId: String(livePatient.id || ''),
          entryId: delId,
        });
        if (out && out.ok) {
          rt.showToast('Eventualidad eliminada.', 'success');
          refreshEventualidadesPanelAfterPersist(mountEl);
        } else {
          rt.showToast('No se pudo eliminar la eventualidad.', 'error');
          refreshEventualidadesPanelAfterPersist(mountEl);
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
    const livePatient = activePatient() || patient;
    const liveStore = ensureEventualidades(livePatient);
    const wasEdit = !!_editingEntryId;
    let next;
    if (_editingEntryId) {
      next = updateEventualidad(liveStore, _editingEntryId, { text: text, at: atIso });
    } else {
      next = appendEventualidad(liveStore, text, '', atIso);
    }
    if (!wasEdit && next.entries.length === liveStore.entries.length) {
      rt.showToast('Escribe la eventualidad antes de agregar.', 'error');
      return;
    }
    const added = next.entries[next.entries.length - 1];
    const command = wasEdit
      ? {
          type: 'eventualidad.upsert',
          patientId: String(livePatient.id || ''),
          entry: {
            id: _editingEntryId,
            text: text,
            at: atIso,
          },
        }
      : {
          type: 'eventualidad.upsert',
          patientId: String(livePatient.id || ''),
          entry: {
            id: added && added.id,
            text: added && added.text,
            at: added && added.at,
            kind: added && added.kind,
          },
        };
    _editingEntryId = null;
    livePatient.eventualidades = next;
    refreshEventualidadesPanelAfterPersist(mountEl);
    const out = await persistEventualidades(livePatient, next, command);
    if (out && out.ok) {
      rt.showToast(wasEdit ? 'Eventualidad actualizada.' : 'Eventualidad guardada.', 'success');
      refreshEventualidadesPanelAfterPersist(mountEl);
      return;
    }
    rt.showToast(
      out && out.reason === 'empty'
        ? 'Escribe la eventualidad antes de agregar.'
        : 'No se pudo guardar la eventualidad. Intenta de nuevo.',
      'error'
    );
    refreshEventualidadesPanelAfterPersist(mountEl);
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
