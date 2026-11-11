/**
 * Eventualidades panel (timeline + note compose). Preact (Phase 3): same DOM, ids, classes and data-*
 * hooks the string builder in eventualidades-panel-html.mjs made. UI only: eventualidades-render.mjs
 * still owns saving, and wires click/keydown/toggle handlers by id/class after each draw. Every draw
 * unmounts first, so the DOM is rebuilt from scratch like the old `innerHTML` swap (the date picker
 * and removeEventualidadCardEl change this DOM behind Preact's back).
 */
import { render } from 'preact';
import {
  normalizeEventualidadText,
  toEventualidadDateValue,
  formatDaySubLabel,
} from './eventualidades-store.mjs';

const EMPTY = 'Aún no hay eventualidades. Agrégalas abajo.';

function dayIsOpen(group, editingId, dayOpenPrefs) {
  if (dayOpenPrefs.has(group.day)) return dayOpenPrefs.get(group.day);
  if (group.isToday) return true;
  return !!(editingId && group.entries.some((e) => e && String(e.id) === String(editingId)));
}

function EntryCard({ entry, editingId }) {
  const editing = editingId && String(entry.id) === String(editingId);
  return (
    <article class={'ev-card' + (editing ? ' ev-card--editing' : '')} data-entry-id={entry.id}>
      <p class="ev-card__text">{normalizeEventualidadText(entry.text)}</p>
      <footer class="ev-card__foot">
        <div class="ev-card__actions">
          <button type="button" class="ev-card__edit" data-ev-edit={entry.id} aria-label="Editar eventualidad">Editar</button>
          <button type="button" class="ev-card__delete" data-ev-delete={entry.id} aria-label="Eliminar eventualidad">Eliminar</button>
        </div>
      </footer>
    </article>
  );
}

function DaySection({ group, editingId, now, dayOpenPrefs }) {
  const n = group.entries.length;
  const sub = formatDaySubLabel(group.day, now);
  return (
    <details class={'ev-day' + (group.isToday ? ' ev-day--today' : '')} open={dayIsOpen(group, editingId, dayOpenPrefs)} data-day={group.day}>
      <summary class="ev-day__summary">
        <span class="rp-dot" aria-hidden="true"></span>
        <div class="ev-day__titles">
          <span class="ev-day__pill">{group.label}</span>
          {sub ? <span class="ev-day__date">{sub}</span> : null}
        </div>
        <span class="ev-day__count">{n === 1 ? '1 registro' : n + ' registros'}</span>
      </summary>
      <div class="ev-day__panel">
        {group.entries.map((e) => <EntryCard entry={e} editingId={editingId} />)}
      </div>
    </details>
  );
}

function NoteCompose({ editingEntry, now }) {
  const isEdit = !!editingEntry;
  const at = toEventualidadDateValue(isEdit ? editingEntry.at : now);
  return (
    <footer class="ev-compose" data-ev-mode="note">
      <div class={'ev-compose__card' + (isEdit ? ' ev-compose__card--edit' : '')}>
        <div class="ev-compose__pane" data-ev-pane="note">
          <div class="ev-compose__top">
            <label class="ev-compose__label" for="eventualidades-input">{isEdit ? 'Editar eventualidad' : 'Nueva eventualidad'}</label>
            <div class="ev-compose__date-slot">
              <input type="date" id="eventualidades-at" class="rpc-date-input" value={at} title="Fecha de la eventualidad" aria-label="Fecha de la eventualidad" />
            </div>
          </div>
          <textarea id="eventualidades-input" class="ev-compose__input" rows="2" placeholder="Describe lo ocurrido…" value={isEdit ? String(editingEntry.text || '') : ''}></textarea>
          <div class="ev-compose__actions">
            <span class="ev-compose__hint">{isEdit ? 'Puedes cambiar la fecha y el texto' : 'Elige una fecha anterior si aplica'}</span>
            <div class="ev-compose__btns">
              {isEdit ? <button type="button" class="ea-btn ea-btn--ghost ev-compose__cancel" id="eventualidades-cancel">Cancelar</button> : null}
              <button type="button" class="ea-btn ea-btn--primary ev-compose__submit" id="eventualidades-add">{isEdit ? 'Guardar' : 'Agregar'}</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** @param {{ byDay: object[], editingEntry: object|null, editingId: string|null, dayOpenPrefs: Map<string, boolean>, now?: Date }} props */
export function EventualidadesPanel({ byDay, editingEntry, editingId, dayOpenPrefs, now = new Date() }) {
  const has = byDay.length > 0;
  return (
    <div class="ev-panel" data-ev-view="note">
      <header class="ev-panel__head">
        <p class="ev-panel__hint">Bitácora cronológica de la hospitalización, agrupada por día.</p>
      </header>
      <div class={'ev-timeline' + (has ? '' : ' ev-timeline--empty')} role="group" aria-label="Eventualidades por día" data-ev-timeline="note">
        {has ? (
          <div class="ev-timeline__days">
            {byDay.map((g) => <DaySection group={g} editingId={editingId} now={now} dayOpenPrefs={dayOpenPrefs} />)}
          </div>
        ) : (
          <p class="ev-empty">{EMPTY}</p>
        )}
      </div>
      <NoteCompose editingEntry={editingEntry} now={now} />
    </div>
  );
}

/** Draw into `host`, replacing whatever was there (same effect as the old `host.innerHTML = html`). */
function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawEventualidadesPanel = (host, props) => draw(host, <EventualidadesPanel {...props} />);
export const drawEventualidadesNoPatient = (host) => draw(host, <p class="tend-empty">Selecciona un paciente.</p>);
