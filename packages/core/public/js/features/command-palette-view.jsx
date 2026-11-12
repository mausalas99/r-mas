/**
 * ⌘K command palette rows. Preact: same DOM and classes the createElement/innerHTML code in
 * command-palette.mjs made. Search, ranking, which row is selected and what each pick does stay there.
 * Each draw unmounts first, so the list is rebuilt from scratch like the old `textContent = ''` + append.
 */
import { render } from 'preact';

const ICON_ATTRS = {
  width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  'stroke-width': '2', 'stroke-linecap': 'round', 'aria-hidden': 'true',
};
const ROW_ICON = {
  bolt: <svg {...ICON_ATTRS}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>,
  page: <svg {...ICON_ATTRS}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></svg>,
  person: <svg {...ICON_ATTRS}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
};
const ROW_ICON_KEY = { action: 'bolt', section: 'page', 'app-tab': 'page', patient: 'person', 'patient-section': 'page' };

// Group order matches the board: Secciones, Pacientes, Acciones.
const GROUP_TITLES = ['Secciones', 'Pacientes', 'Acciones'];
export function groupOf(item) {
  if (item.kind === 'patient' || item.kind === 'patient-section') return 1;
  if (item.kind === 'action') return 2;
  return 0;
}

const isPatientKind = (item) => item.kind === 'patient' || item.kind === 'patient-section';

function Empty({ query }) {
  const typed = String(query || '').trim();
  return (
    <li class="cmdk-empty" role="status">
      <span class="cmdk-empty-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
      </span>
      <span class="empty-state-title">{typed ? 'Sin coincidencias' : 'Atajos del workbench'}</span>
      <span class="empty-state-lead">
        {typed
          ? 'Prueba con una acción (exportar, labs), el nombre del paciente o una sección.'
          : 'Escribe para buscar acciones, pacientes o secciones del expediente.'}
      </span>
    </li>
  );
}

/** @param {{ items: object[], selected: number, query: string, onHover: (i: number) => void, onPick: (item: object) => void }} props items arrive sorted by group. */
export function PaletteList({ items, selected, query, onHover, onPick }) {
  if (!items.length) return <Empty query={query} />;
  let lastGroup = -1;
  return items.map((item, i) => {
    const g = groupOf(item);
    const title = g !== lastGroup ? <li class="cmdk-group-title" role="presentation">{GROUP_TITLES[g]}</li> : null;
    lastGroup = g;
    const hint = isPatientKind(item) ? String(item.hint || '') : '';
    return (
      <>
        {title}
        <li
          class={'cmdk-item' + (item.kind === 'action' ? ' cmdk-item--action' : '') + (i === selected ? ' is-selected' : '')}
          role="option"
          aria-selected={i === selected ? 'true' : 'false'}
          data-cmdk-index={String(i)}
          onPointerEnter={() => onHover(i)}
          onClick={() => onPick(item)}
        >
          <span class="cmdk-item-icon" aria-hidden="true">{ROW_ICON[ROW_ICON_KEY[item.kind]] || null}</span>
          <span class="cmdk-item-label">{item.label}</span>
          {hint ? <span class="cmdk-item-hint">{hint}</span> : null}
        </li>
      </>
    );
  });
}

export function drawPaletteList(host, props) {
  render(null, host);
  host.textContent = '';
  render(<PaletteList {...props} />, host);
}
