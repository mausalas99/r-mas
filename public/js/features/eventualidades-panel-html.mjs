/**
 * HTML builders for Eventualidades panel (timeline + note compose).
 * Solo bitácora clínica — sin pestaña Labs / interpretación.
 */
import {
  normalizeEventualidadText,
  toEventualidadDateValue,
  formatDaySubLabel,
} from './eventualidades-store.mjs';
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
 * @param {object} _store unused (API compat)
 * @param {'note'|'labs'} [_mode] unused — always note
 * @param {{ editingEntryId: string|null, composeMode?: string, dayOpenPrefs: Map<string, boolean> }} ctx
 */
export function buildEventualidadesPanelHtml(byDay, hasEntries, editingEntry, _store, _mode, ctx) {
  var editingId = ctx.editingEntryId;
  var dayOpenPrefs = ctx.dayOpenPrefs;
  var timelineInner = !hasEntries
    ? '<p class="ev-empty">Aún no hay eventualidades. Agrégalas abajo.</p>'
    : '<div class="ev-timeline__days">' +
      byDay
        .map(function (day) {
          return renderDaySection(day, editingId, new Date(), dayOpenPrefs);
        })
        .join('') +
      '</div>';
  return (
    '<div class="ev-panel" data-ev-view="note">' +
    '<header class="ev-panel__head">' +
    '<p class="ev-panel__hint">Bitácora cronológica de la hospitalización, agrupada por día.</p>' +
    '</header>' +
    '<div class="ev-timeline' +
    (!hasEntries ? ' ev-timeline--empty' : '') +
    '" role="feed" aria-label="Eventualidades por día" data-ev-timeline="note">' +
    timelineInner +
    '</div>' +
    renderNoteCompose(editingEntry) +
    '</div>'
  );
}
