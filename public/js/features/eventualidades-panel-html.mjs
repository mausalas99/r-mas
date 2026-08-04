/**
 * HTML builders for Eventualidades panel (timeline + note compose).
 * Labs mode = timeline only (autosend → labsText); no Interpretación dock.
 */
import {
  normalizeEventualidadText,
  toEventualidadDateValue,
  formatDaySubLabel,
} from './eventualidades-store.mjs';
import { renderLabsTimelineInnerHtml } from './eventualidades-labs-timeline.mjs';
import { esc } from '../dom-escape.mjs';

/**
 * @param {{ day: string, isToday?: boolean, entries: object[] }} dayGroup
 * @param {string|null} editingId
 * @param {Map<string, boolean>} dayOpenPrefs
 */
function daySectionIsOpen(dayGroup, editingId, dayOpenPrefs) {
  if (dayOpenPrefs.has(dayGroup.day)) return dayOpenPrefs.get(dayGroup.day);
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

function renderDaySection(dayGroup, editingId, now, dayOpenPrefs) {
  const n = dayGroup.entries.length;
  const countLabel = n === 1 ? '1 registro' : n + ' registros';
  const subLabel = formatDaySubLabel(dayGroup.day, now);
  const todayClass = dayGroup.isToday ? ' ev-day--today' : '';
  const isOpen = daySectionIsOpen(dayGroup, editingId, dayOpenPrefs);
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

/**
 * @param {'note'|'labs'} mode
 * @param {boolean} isEdit
 */
export function renderModeSwitcher(mode, isEdit) {
  const active = isEdit ? 'note' : mode;
  return (
    '<div class="ev-mode-switch" role="tablist" aria-label="Vista Eventualidades">' +
    '<span class="ev-mode-switch__pill" aria-hidden="true"></span>' +
    '<button type="button" class="ev-mode-switch__tab' +
    (active === 'note' ? ' active' : '') +
    '" role="tab" data-ev-mode="note" aria-selected="' +
    (active === 'note' ? 'true' : 'false') +
    '">Eventualidad</button>' +
    '<button type="button" class="ev-mode-switch__tab' +
    (active === 'labs' ? ' active' : '') +
    '" role="tab" data-ev-mode="labs" aria-selected="' +
    (active === 'labs' ? 'true' : 'false') +
    '"' +
    (isEdit ? ' disabled title="Termina la edición para cambiar a Labs"' : '') +
    '>Labs</button>' +
    '</div>'
  );
}

function renderNoteCompose(editingEntry) {
  const isEdit = !!editingEntry;
  const atValue = isEdit
    ? toEventualidadDateValue(editingEntry.at)
    : toEventualidadDateValue(new Date());
  const textValue = isEdit ? String(editingEntry.text || '') : '';
  return (
    '<footer class="ev-compose" data-ev-mode="note">' +
    '<div class="ev-compose__card' +
    (isEdit ? ' ev-compose__card--edit' : '') +
    '">' +
    '<div class="ev-compose__pane" data-ev-pane="note">' +
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
    '</div></div></div></div></footer>'
  );
}

/**
 * @param {object[]} byDay
 * @param {boolean} hasEntries
 * @param {object|null} editingEntry
 * @param {object} store
 * @param {'note'|'labs'} mode
 * @param {{ editingEntryId: string|null, composeMode: 'note'|'labs', dayOpenPrefs: Map<string, boolean> }} ctx
 */
function buildTimelineInner(byDay, hasEntries, editingEntry, store, mode, ctx) {
  var showLabs = mode === 'labs' && !editingEntry;
  if (showLabs) return renderLabsTimelineInnerHtml(store);
  if (!hasEntries) {
    return '<p class="ev-empty">Aún no hay eventualidades. Agrégalas abajo, o cambia a Labs para ver interpretaciones.</p>';
  }
  var editingId = ctx.editingEntryId;
  var dayOpenPrefs = ctx.dayOpenPrefs;
  return (
    '<div class="ev-timeline__days">' +
    byDay
      .map(function (day) {
        return renderDaySection(day, editingId, new Date(), dayOpenPrefs);
      })
      .join('') +
    '</div>'
  );
}

/**
 * @param {object[]} byDay
 * @param {boolean} hasEntries
 * @param {object|null} editingEntry
 * @param {object} store
 * @param {'note'|'labs'} mode
 * @param {{ editingEntryId: string|null, composeMode: 'note'|'labs', dayOpenPrefs: Map<string, boolean> }} ctx
 */
export function buildEventualidadesPanelHtml(byDay, hasEntries, editingEntry, store, mode, ctx) {
  var showLabsTimeline = mode === 'labs' && !editingEntry;
  var timelineInner = buildTimelineInner(byDay, hasEntries, editingEntry, store, mode, ctx);
  var labsEmpty = showLabsTimeline && timelineInner.indexOf('ev-empty') !== -1;
  var hint = showLabsTimeline
    ? 'Interpretaciones de labs por día — llegan al procesar / Actualizar / cola.'
    : 'Bitácora cronológica de la hospitalización, agrupada por día.';
  var aria = showLabsTimeline ? 'Interpretaciones de labs por día' : 'Eventualidades por día';
  var emptyClass =
    (showLabsTimeline ? labsEmpty : !hasEntries) ? ' ev-timeline--empty' : '';
  var composeHtml = showLabsTimeline ? '' : renderNoteCompose(editingEntry);
  return (
    '<div class="ev-panel" data-ev-view="' +
    esc(showLabsTimeline ? 'labs' : 'note') +
    '">' +
    '<header class="ev-panel__head">' +
    '<div class="ev-panel__head-row">' +
    renderModeSwitcher(mode, !!editingEntry) +
    '</div>' +
    '<p class="ev-panel__hint">' +
    hint +
    '</p>' +
    '</header>' +
    '<div class="ev-timeline' +
    emptyClass +
    '" role="feed" aria-label="' +
    aria +
    '" data-ev-timeline="' +
    (showLabsTimeline ? 'labs' : 'note') +
    '">' +
    timelineInner +
    '</div>' +
    composeHtml +
    '</div>'
  );
}
