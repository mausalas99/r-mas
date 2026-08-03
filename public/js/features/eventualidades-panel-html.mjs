/**
 * HTML builders for Eventualidades panel (timeline inline + compose for sheet).
 */
import {
  normalizeEventualidadText,
  toEventualidadDateValue,
  formatDaySubLabel,
} from './eventualidades-store.mjs';
import { renderEventualidadesLabsPane } from './eventualidades-labs-ui.mjs';
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

function renderNotePane(editingEntry, composeMode) {
  const isEdit = !!editingEntry;
  const atValue = isEdit
    ? toEventualidadDateValue(editingEntry.at)
    : toEventualidadDateValue(new Date());
  const textValue = isEdit ? String(editingEntry.text || '') : '';
  return (
    '<div class="ev-compose__pane" data-ev-pane="note"' +
    (isEdit || composeMode !== 'labs' ? '' : ' hidden') +
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

function renderLabsPaneWrapped(store, mode) {
  return (
    '<div class="ev-compose__pane" data-ev-pane="labs"' +
    (mode === 'labs' ? '' : ' hidden') +
    '>' +
    '<div class="ev-sheet__labs-preview material-solid-elevated">' +
    renderEventualidadesLabsPane(store) +
    '</div></div>'
  );
}

/**
 * Compose block for Hybrid H sheet (glass outer applied by sheet bridge).
 * @param {object|null} editingEntry
 * @param {object} store
 * @param {'note'|'labs'} composeMode
 */
export function buildEventualidadesComposeHtml(editingEntry, store, composeMode) {
  const isEdit = !!editingEntry;
  const mode = isEdit ? 'note' : composeMode;
  return (
    '<div class="ev-compose ev-compose--sheet" data-ev-mode="' +
    esc(mode) +
    '">' +
    '<div class="ev-compose__card' +
    (isEdit ? ' ev-compose__card--edit' : '') +
    '">' +
    renderComposeSwitcher(mode, isEdit) +
    renderNotePane(editingEntry, composeMode) +
    renderLabsPaneWrapped(store, mode) +
    '</div></div>'
  );
}

function renderPanelActions() {
  return (
    '<footer class="ev-actions" aria-label="Agregar registro">' +
    '<button type="button" class="ea-btn ea-btn--primary ev-actions__btn" data-ev-open-compose="note">' +
    'Nueva eventualidad</button>' +
    '<button type="button" class="ea-btn ea-btn--ghost ev-actions__btn" data-ev-open-compose="labs">' +
    'Labs</button>' +
    '</footer>'
  );
}

/**
 * Inline panel: timeline + action strip (compose lives in sheet).
 * @param {object[]} byDay
 * @param {boolean} hasEntries
 * @param {{ editingEntryId: string|null, dayOpenPrefs: Map<string, boolean> }} ctx
 */
export function buildEventualidadesPanelHtml(byDay, hasEntries, ctx) {
  const editingId = ctx.editingEntryId;
  const dayOpenPrefs = ctx.dayOpenPrefs;
  const timelineInner = hasEntries
    ? '<div class="ev-timeline__days">' +
      byDay
        .map(function (day) {
          return renderDaySection(day, editingId, new Date(), dayOpenPrefs);
        })
        .join('') +
      '</div>'
    : '<p class="ev-empty">Aún no hay eventualidades. Usa los botones de abajo: Eventualidad o Labs.</p>';
  return (
    '<div class="ev-panel">' +
    '<header class="ev-panel__head">' +
    '<p class="ev-panel__hint">Bitácora cronológica de la hospitalización, agrupada por día.</p>' +
    '</header>' +
    '<div class="ev-timeline' +
    (hasEntries ? '' : ' ev-timeline--empty') +
    '" role="feed" aria-label="Eventualidades por día">' +
    timelineInner +
    '</div>' +
    renderPanelActions() +
    '</div>'
  );
}
