/**
 * Sidebar patient list (#patient-list). Preact: same DOM, classes, ids and data-* hooks the string
 * builders in patients-card-html.mjs and the DOM patchers of patient-list-incremental.mjs made.
 * Preact owns everything inside #patient-list: cards are keyed rows, so a changed patient redraws
 * one card; a long active zone draws only the cards in view (the old virtual scroll, now a state:
 * `state.win` = scroll position and box height, set by patients-list.mjs). Drag-to-reorder is
 * Sortable in patients-list.mjs: on drop it reports the new order and this view redraws from it.
 * Clicks stay with the delegation on #patient-list and the global `data-onclick` handlers.
 * State comes from patients-list-model.mjs.
 */
import { Component, render } from 'preact';
import { computeVisibleRange } from '../virtual-scroll-range.mjs';
import { createStore } from '../ui-kit/store.mjs';
import {
  PATIENT_ACTIVE_ITEM_STRIDE,
  PATIENT_ACTIVE_OVERSCAN,
  cardClass,
  emptyPatientListState,
} from './patients-list-model.mjs';

const svgProps = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
  'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
};
const PinIcon = () => (
  <svg {...svgProps} width="13" height="13"><path d="M12 17v5"></path><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"></path></svg>
);
const ArchiveIcon = () => (
  <svg {...svgProps} width="13" height="13"><rect x="3" y="4" width="18" height="4" rx="1"></rect><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"></path><path d="M10 12h4"></path></svg>
);

function CardToolbar({ c }) {
  if (c.bulk) {
    return (
      <div class="patient-card-toolbar patient-card-toolbar--bulk">
        <span class={'patient-bulk-check' + (c.bulkOn ? ' patient-bulk-check--on' : '')} aria-hidden="true">{c.bulkOn ? '✓' : ''}</span>
      </div>
    );
  }
  const args = JSON.stringify([c.id]);
  const pinTitle = c.pinOn ? 'Quitar de fijados' : 'Fijar paciente';
  const archTitle = c.archOn ? 'Restaurar del archivo' : 'Archivar paciente';
  return (
    <div class="patient-card-toolbar">
      <div class="patient-card-toolbar-left">
        {c.showPin ? (
          <button type="button" class={'patient-toolbar-chip patient-toolbar-chip--icon btn-pinned-text' + (c.pinOn ? ' patient-toolbar-chip--on' : '')}
            title={pinTitle} aria-label={pinTitle} aria-pressed={String(c.pinOn)}
            data-onclick="togglePatientPinned" data-onclick-args={args} data-onclick-pass="event"><PinIcon /></button>
        ) : null}
        <button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon btn-archive-clean"
          title={archTitle} aria-label={archTitle}
          data-onclick="togglePatientArchived" data-onclick-args={args} data-onclick-pass="event">{c.archOn ? '↩' : <ArchiveIcon />}</button>
      </div>
      {c.canDelete ? (
        <button type="button" class="btn-delete-card" data-onclick="deletePatient" data-onclick-args={args} data-onclick-pass="event" aria-label="Eliminar">×</button>
      ) : null}
    </div>
  );
}

/**
 * One patient card. It redraws only when its model object changed (the model keeps the same object
 * for an unchanged card) or its slot moved, so editing one patient never rebuilds its neighbours.
 * `top` is set for a card inside the windowed zone (absolute position), `index` is its row there.
 */
export class PatientCard extends Component {
  shouldComponentUpdate(next) {
    const cur = this.props;
    return next.c !== cur.c || next.top !== cur.top || next.index !== cur.index;
  }

  render({ c, top, index }) {
    const slot = top != null;
    const style = (c.svcHue != null ? '--svc-hue:' + c.svcHue + (slot ? ';' : '') : '')
      + (slot ? 'position:absolute;top:' + top + 'px;left:0;right:0;box-sizing:border-box' : '');
    return (
      <div class={cardClass(c)} data-patient-id={c.id} data-virtual-index={slot ? String(index) : undefined} style={style || undefined}>
        <CardToolbar c={c} />
        <div class="patient-card-body">
          <div class="p-name" title={c.title || undefined}>
            {c.name}
            <button type="button" class="patient-card-open card-open-btn" aria-label={c.openLabel}></button>
          </div>
          {c.bed.length || c.svc ? (
            <div class="p-meta">
              {c.bed.map((t) => <span>{t}</span>)}
              {c.svc ? <span class="patient-card-svc">{c.svc}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

function PinnedLabel({ count }) {
  return (
    <div class="patient-list-section-label patient-list-section-label--pinned" role="group" aria-label="Pacientes fijados">
      <span class="patient-list-section-label__lead">
        <svg class="patient-list-pin-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 1 0-6 0v3.76z"></path></svg>
        Fijados
      </span>
      <span class="patient-list-section-count">{count}</span>
    </div>
  );
}

const ActiveLabel = ({ count }) => (
  <div class="patient-list-section-label" role="group" aria-label="Lista de pacientes">Pacientes <span class="patient-list-section-count">{count}</span></div>
);

const ArchivedToggle = ({ collapsed, count }) => (
  <button type="button" class="patient-list-section-toggle" data-onclick="toggleArchivedSection" data-onclick-pass="event" aria-expanded={collapsed ? 'false' : 'true'}>Archivados <span>({count})</span> <span class="rp-dot" aria-hidden="true"></span></button>
);

const Zone = ({ name, cards }) => (
  <div class="patient-sort-zone" data-patient-zone={name}>
    {cards.map((c) => <PatientCard key={c.id} c={c} />)}
  </div>
);

/** The active zone when it is long: a box of fixed height that scrolls, with only the cards in view (plus 3 either side) drawn. */
function WindowedZone({ cards, win, h }) {
  const stride = PATIENT_ACTIVE_ITEM_STRIDE;
  const range = computeVisibleRange({
    scrollTop: win.scrollTop,
    itemCount: cards.length,
    itemHeight: stride,
    viewportHeight: win.height || stride * 5,
    overscan: PATIENT_ACTIVE_OVERSCAN,
  });
  const shown = range.endIndex < range.startIndex ? [] : cards.slice(range.startIndex, range.endIndex + 1);
  const boxStyle = 'overflow:auto;min-height:0' + (win.height ? ';height:' + win.height + 'px;flex-shrink:0' : '');
  return (
    <div class="patient-sort-zone patient-sort-zone--virtual-active" data-patient-zone="active" style={boxStyle}
      onScroll={(ev) => h && h.onScroll && h.onScroll(ev.currentTarget.scrollTop)}>
      <div class="virtual-scroll-inner" style={'position:relative;width:100%;height:' + range.totalHeight + 'px'}>
        {shown.map((c, i) => (
          <PatientCard key={c.id} c={c} top={(range.startIndex + i) * stride} index={range.startIndex + i} />
        ))}
      </div>
    </div>
  );
}

const MESSAGE_COLOR = { muted: 'var(--text-muted)', slate: '#94a3b8' };

/** @param {{ state: ReturnType<typeof emptyPatientListState>, h?: { onScroll?: (top: number) => void } }} props */
export function PatientListView({ state, h }) {
  if (state.kind === 'message') {
    return (
      <div key="message" style={'padding:20px;text-align:center;color:' + (MESSAGE_COLOR[state.tone] || MESSAGE_COLOR.muted) + ';font-size:13px;'}>{state.message}</div>
    );
  }
  if (state.kind !== 'cards') return null;
  return (
    <>
      {state.pinned.length ? <PinnedLabel key="pinned-label" count={state.pinned.length} /> : null}
      {state.pinned.length ? <Zone key="pinned" name="pinned" cards={state.pinned} /> : null}
      {state.active.length ? <ActiveLabel key="active-label" count={state.active.length} /> : null}
      {state.active.length && state.virtual ? <WindowedZone key="active" cards={state.active} win={state.win} h={h} /> : null}
      {state.active.length && !state.virtual ? <Zone key="active" name="active" cards={state.active} /> : null}
      {state.archived.length ? <ArchivedToggle key="archived-toggle" collapsed={state.archivedCollapsed} count={state.archived.length} /> : null}
      {state.archived.length && !state.archivedCollapsed ? <Zone key="archived" name="archived" cards={state.archived} /> : null}
    </>
  );
}

/**
 * Start drawing into `list` (what is inside is cleared). Returns the store holding the state: set it
 * and the list redraws at once. `destroy()` empties the list and stops drawing.
 */
export function mountPatientListView(list, h) {
  list.textContent = '';
  const store = createStore(emptyPatientListState());
  const stop = store.subscribe((state) => render(<PatientListView state={state} h={h} />, list));
  return {
    store,
    destroy() {
      stop();
      render(null, list);
    },
  };
}
