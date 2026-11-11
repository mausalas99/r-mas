/**
 * Interconsulta mode chrome markup. Preact: same DOM, classes, ids and data-* hooks the string builders
 * in interconsulta-mode-chrome.mjs made. That file still owns every handler: it wires the bar buttons,
 * delegates clicks on `data-ic-*`, and edits `hidden` / `aria-pressed` / `is-focused` in place.
 * Each mount is rendered into a node the caller repaints from scratch, never diffed again.
 */
import { render } from 'preact';
import { bedLine } from './sala-view-variants.mjs';

export function IcBar() {
  return (
    <div class="wb-ic-bar">
      <div class="wb-ic-bar-name">
        <button type="button" class="wb-btn wb-btn-secondary wb-ic-back-btn" data-wb-ic-back="" hidden title="Volver al tablero de equipos">← Tablero</button>
        <span class="wb-mode-frame-name">Interconsulta</span>
      </div>
      <div class="wb-ic-bar-mid"></div>
      <div class="wb-ic-bar-actions">
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-toggle" data-wb-ic-guardia-filter="" aria-pressed="false" title="Mostrar solo Preop / Nuevas hoy del equipo de guardia">Solo guardia de hoy</button>
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-toggle" data-wb-ic-hide-postguardia="" aria-pressed="false" title="Oculta la calle de post-guardia del tablero (no cambia los datos)">Ocultar post-guardia</button>
        <details class="wb-menu" data-wb-ic-menu="">
          <summary class="wb-btn wb-btn-secondary" aria-haspopup="menu" title="Más acciones">⋯</summary>
          <div class="wb-menu-panel" role="menu">
            <button type="button" class="wb-menu-item" role="menuitem" data-wb-ic-generar-nota="">Generar nota (.docx)</button>
          </div>
        </details>
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-shortcut" data-wb-shortcut="">⌘/</button>
        <button type="button" class="wb-btn wb-btn-primary" data-wb-ic-primary="">Actualizar labs</button>
      </div>
    </div>
  );
}

/** The top bar. Handlers and `hidden` / `aria-pressed` state are the caller's. */
export function mountIcBar(container) {
  render(null, container);
  render(<IcBar />, container);
}

/** Header pills: `pills` is [[label, text]] from icTimerStats (empty = no pills). */
function Stats({ pills }) {
  if (!pills.length) return null;
  return <span class="ic-stats">{pills.map(([label, text]) => <span class="ic-stat"><i>{label}</i>{' ' + text}</span>)}</span>;
}

function Header({ mode, options, teamId, count, pills, guardiaName }) {
  const seg = (key, label) => (
    <button type="button" class={'ic-mode-btn' + (mode === key ? ' is-on' : '')} data-ic-mode={key} aria-pressed={mode === key ? 'true' : 'false'}>{label}</button>
  );
  return (
    <div class="ic-board-header">
      <strong class="ic-board-title">Interconsultas</strong>
      <span class="ic-board-count">{count + ' pacientes'}</span>
      <Stats pills={pills} />
      <div class="ic-mode-seg" role="group" aria-label="Modo del tablero">{seg('asignar', 'Asignar')}{seg('equipo', 'Mi equipo')}</div>
      {mode === 'equipo' && options.length ? (
        <select class="ic-team-select" data-ic-my-team="" aria-label="Mi equipo">
          {options.map((o) => <option value={o.id} selected={o.id === teamId}>{o.label}</option>)}
        </select>
      ) : null}
      {mode === 'equipo' && guardiaName ? <span class="ic-board-duty">Guardia hoy: <b>{guardiaName}</b></span> : null}
      <span class="ic-board-header__sp"></span>
      <button type="button" class="wb-btn wb-btn-secondary" data-ic-board-add="">+ Agregar</button>
      <button type="button" class="wb-btn wb-btn-primary" data-ic-board-refresh="">Actualizar labs</button>
    </div>
  );
}

function Keys({ mode }) {
  return (
    <div class="ic-keys" role="note" aria-label="Atajos de teclado">
      <span><kbd>J</kbd><kbd>K</kbd> Mover</span>
      {mode === 'equipo' ? null : <><span><kbd>1</kbd>–<kbd>4</kbd> Asignar al equipo</span><span><kbd>0</kbd> Sin equipo</span></>}
      <span><kbd>R</kbd> Respondida</span>
      <span><kbd>A</kbd> Archivar</span>
      <span><kbd>↵</kbd> Abrir paciente</span>
      <span><kbd>⌘/</kbd> Todos los atajos</span>
    </div>
  );
}

/** Header + the two empty mounts the board and Archivados draw into + shortcut legend. */
export function BoardFrame(props) {
  return (
    <>
      <Header {...props} />
      <div id="ic-team-board-mount"></div>
      <div id="ic-archived-mount"></div>
      <Keys mode={props.mode} />
    </>
  );
}

export function mountIcBoardFrame(mount, props) {
  render(null, mount);
  render(<BoardFrame {...props} />, mount);
}

/** One archived patient: name opens the chart, restore un-archives, × deletes (after a confirm). */
function ArchivedChip({ p, canDelete }) {
  const id = String(p.id);
  const name = p.nombre || 'Sin nombre';
  return (
    <div class="ic-arch__chip">
      <button type="button" class="ic-arch__name" data-ic-open={id}>{name}<span class="ic-arch__bed">{bedLine(p)}</span></button>
      <button type="button" class="ic-arch__restore" aria-label={'Restaurar ' + name} data-onclick="togglePatientArchived" data-onclick-args={JSON.stringify([p.id])} data-onclick-pass="event">Restaurar</button>
      {canDelete(p) ? <button type="button" class="ic-arch__del" aria-label={'Eliminar ' + name} data-ic-arch-del={id}>×</button> : null}
    </div>
  );
}

/** Archivados section; `canDelete(p)` is the caller's permission rule. Nothing when the list is empty. */
export function Archived({ patients, collapsed, canDelete }) {
  if (!patients.length) return null;
  return (
    <section class="ic-arch">
      <button type="button" class="ic-arch__toggle" data-ic-archived-toggle="" aria-expanded={!collapsed ? 'true' : 'false'}>
        <span class="ic-arch__title">Archivados</span><span class="ic-arch__count">{String(patients.length)}</span>
      </button>
      {collapsed ? null : <div class="ic-arch__chips">{patients.map((p) => <ArchivedChip p={p} canDelete={canDelete} />)}</div>}
    </section>
  );
}

export function mountIcArchived(container, patients, collapsed, canDelete) {
  render(null, container);
  render(<Archived patients={patients} collapsed={collapsed} canDelete={canDelete} />, container);
}
