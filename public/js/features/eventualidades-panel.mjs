import { patients, saveState } from '../app-state.mjs';
import { createMutationBuilder } from '../versioned-mutation.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import {
  isLanSessionConfiguredForRest,
  lanPushPatientVersioned,
  lanFetchHostPatientRow,
} from './lan-sync.mjs';
import { toClinicalHistoryText } from '../../../lib/historia-clinica/clinical-text.mjs';

let _editingEntryId = null;
/** @type {Map<string, boolean>} */
const _dayOpenPrefs = new Map();

export function normalizeEventualidadText(text) {
  return toClinicalHistoryText(text).trim();
}

let rt = {
  getActiveId() {
    return null;
  },
  showToast(_msg, _type) {},
};

export function registerEventualidadesRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** @param {Date | string | number} [when] @returns {string} YYYY-MM-DD */
export function toEventualidadDateValue(when) {
  const d = when == null ? new Date() : when instanceof Date ? when : new Date(when);
  if (!Number.isFinite(d.getTime())) return '';
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/** @param {string} dateIso YYYY-MM-DD — almacena mediodía local para agrupar por día */
export function eventualidadDateToIso(dateIso) {
  const raw = String(dateIso || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return eventualidadDateToIso(toEventualidadDateValue(new Date()));
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(y, mo - 1, day, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
}

export function appendEventualidad(store, text, clientId, atIso) {
  const t = normalizeEventualidadText(text);
  if (!t) return store || { entries: [] };
  const at =
    atIso && String(atIso).trim()
      ? String(atIso).trim()
      : eventualidadDateToIso(toEventualidadDateValue(new Date()));
  const entry = {
    id: 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at: at,
    text: t,
    clientId: clientId || undefined,
  };
  const entries = Array.isArray(store && store.entries) ? store.entries.slice() : [];
  entries.push(entry);
  return { entries };
}

export function updateEventualidad(store, entryId, patch) {
  const id = String(entryId || '').trim();
  if (!id) return store || { entries: [] };
  const entries = Array.isArray(store && store.entries) ? store.entries.slice() : [];
  const idx = entries.findIndex(function (e) {
    return e && String(e.id) === id;
  });
  if (idx === -1) return { entries };
  const cur = entries[idx];
  const text =
    patch && patch.text != null
      ? normalizeEventualidadText(patch.text)
      : normalizeEventualidadText(cur.text);
  if (!text) return { entries };
  const at =
    patch && patch.at != null && String(patch.at).trim()
      ? String(patch.at).trim()
      : cur.at;
  entries[idx] = Object.assign({}, cur, { text: text, at: at });
  return { entries };
}

export function findEventualidadEntry(store, entryId) {
  const id = String(entryId || '').trim();
  if (!id) return null;
  return (
    (Array.isArray(store && store.entries) ? store.entries : []).find(function (e) {
      return e && String(e.id) === id;
    }) || null
  );
}

export function removeEventualidad(store, entryId) {
  const id = String(entryId || '').trim();
  if (!id) return store || { entries: [] };
  const entries = (Array.isArray(store && store.entries) ? store.entries : []).filter(function (e) {
    return e && String(e.id) !== id;
  });
  return { entries };
}

export function sortEntriesDesc(entries) {
  return (entries || [])
    .slice()
    .sort(function (a, b) {
      return String(b.at || '').localeCompare(String(a.at || ''));
    });
}

/** Local calendar day key (YYYY-MM-DD) for grouping. */
export function dayKeyFromIso(iso) {
  if (!iso) return 'unknown';
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return 'unknown';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  } catch (_e) {
    return 'unknown';
  }
}

export function formatDayLabel(dayKey, now) {
  if (dayKey === 'unknown') return 'Sin fecha';
  const parts = String(dayKey).split('-').map(Number);
  if (parts.length !== 3 || parts.some(function (n) {
    return !Number.isFinite(n);
  })) {
    return String(dayKey);
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (!Number.isFinite(date.getTime())) return String(dayKey);
  const ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const todayKey = dayKeyFromIso(ref.toISOString());
  const yesterday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1);
  const yesterdayKey = dayKeyFromIso(yesterday.toISOString());
  if (dayKey === todayKey) return 'Hoy';
  if (dayKey === yesterdayKey) return 'Ayer';
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Fecha calendario cuando la etiqueta principal es relativa (Hoy / Ayer). */
export function formatDaySubLabel(dayKey, now) {
  if (dayKey === 'unknown') return '';
  const parts = String(dayKey).split('-').map(Number);
  if (parts.length !== 3 || parts.some(function (n) {
    return !Number.isFinite(n);
  })) {
    return '';
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (!Number.isFinite(date.getTime())) return '';
  const ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const todayKey = dayKeyFromIso(ref.toISOString());
  const yesterday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1);
  const yesterdayKey = dayKeyFromIso(yesterday.toISOString());
  if (dayKey !== todayKey && dayKey !== yesterdayKey) return '';
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

/** Newest day first; within each day, newest entry first. */
export function groupEntriesByDay(entries, now) {
  const map = new Map();
  (entries || []).forEach(function (e) {
    const key = dayKeyFromIso(e && e.at);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  });
  return [...map.entries()]
    .sort(function (a, b) {
      return String(b[0]).localeCompare(String(a[0]));
    })
    .map(function (pair) {
      const day = pair[0];
      const dayEntries = pair[1]
        .slice()
        .sort(function (a, b) {
          const byAt = String(b.at || '').localeCompare(String(a.at || ''));
          if (byAt !== 0) return byAt;
          return String(b.id || '').localeCompare(String(a.id || ''));
        });
      return {
        day: day,
        label: formatDayLabel(day, now),
        isToday: day === dayKeyFromIso((now || new Date()).toISOString()),
        entries: dayEntries,
      };
    });
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function renderComposeBlock(editingEntry) {
  const isEdit = !!editingEntry;
  const atValue = isEdit
    ? toEventualidadDateValue(editingEntry.at)
    : toEventualidadDateValue(new Date());
  const textValue = isEdit ? String(editingEntry.text || '') : '';
  return (
    '<footer class="ev-compose">' +
    '<div class="ev-compose__card' +
    (isEdit ? ' ev-compose__card--edit' : '') +
    '">' +
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
      ? '<button type="button" class="btn-secondary ev-compose__cancel" id="eventualidades-cancel">Cancelar</button>'
      : '') +
    '<button type="button" class="btn-generate ev-compose__submit" id="eventualidades-add">' +
    (isEdit ? 'Guardar' : 'Agregar') +
    '</button>' +
    '</div></div></div></footer>'
  );
}

function activePatient() {
  const id = rt.getActiveId();
  if (!id) return null;
  return patients.find(function (p) {
    return String(p.id) === String(id);
  });
}

function ensureEventualidades(patient) {
  if (!patient.eventualidades || typeof patient.eventualidades !== 'object') {
    patient.eventualidades = { entries: [] };
  }
  if (!Array.isArray(patient.eventualidades.entries)) {
    patient.eventualidades.entries = [];
  }
  return patient.eventualidades;
}

function hostPatientMutationBase(patient, hostRow) {
  if (hostRow) return hostRow;
  return Object.assign({}, patient, { version: 0 });
}

async function persistEventualidades(patient, store) {
  if (!isLanSessionConfiguredForRest()) {
    patient.eventualidades = store;
    saveState();
    return { ok: true };
  }
  const hostRow = await lanFetchHostPatientRow(patient.id);
  const mutation = createMutationBuilder('patient', patient.id)
    .captureBase(hostPatientMutationBase(patient, hostRow))
    .set('eventualidades', store)
    .build();
  const out = await lanPushPatientVersioned(patient.id, mutation);
  if (!out.ok) {
    if (!out.conflict) {
      const msg =
        out.status === 401 || out.status === 403
          ? 'No se pudo autenticar con el host LAN. Revisa el código de equipo.'
          : 'No se pudo guardar la eventualidad en el host LAN.';
      rt.showToast(msg, 'error');
    }
    return out;
  }
  if (out.data) Object.assign(patient, out.data);
  else patient.eventualidades = store;
  saveState();
  return out;
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

  mountEl.innerHTML =
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
      : '<p class="ev-empty">Aún no hay eventualidades. Registra abajo lo ocurrido (puedes elegir fechas anteriores).</p>') +
    '</div>' +
    renderComposeBlock(editingEntry) +
    '</div>';

  refreshRpcDateFields(mountEl);
  wireEventualidadesUppercase(mountEl.querySelector('#eventualidades-input'));

  mountEl.querySelectorAll('.ev-day').forEach(function (dayEl) {
    dayEl.addEventListener('toggle', function () {
      const key = dayEl.getAttribute('data-day');
      if (key) _dayOpenPrefs.set(key, dayEl.open);
    });
  });

  const addBtn = mountEl.querySelector('#eventualidades-add');
  const input = mountEl.querySelector('#eventualidades-input');
  const atInput = mountEl.querySelector('#eventualidades-at');
  const cancelBtn = mountEl.querySelector('#eventualidades-cancel');
  const timeline = mountEl.querySelector('.ev-timeline');
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

  if (timeline) {
    timeline.addEventListener('click', function (ev) {
      const delBtn = ev.target.closest('[data-ev-delete]');
      if (delBtn) {
        const delId = delBtn.getAttribute('data-ev-delete');
        if (!delId) return;
        const row = findEventualidadEntry(store, delId);
        const preview = row
          ? String(row.text || '')
              .trim()
              .slice(0, 80)
          : '';
        const msg = preview
          ? '¿Eliminar esta eventualidad?\n\n“' + preview + (preview.length >= 80 ? '…' : '') + '”'
          : '¿Eliminar esta eventualidad?';
        if (!confirm(msg)) return;
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

export function invalidateEventualidadesPanel() {
  _editingEntryId = null;
  _dayOpenPrefs.clear();
}

