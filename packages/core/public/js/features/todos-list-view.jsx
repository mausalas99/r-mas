/**
 * Pendientes list (toolbar, empty message or grouped rows). Preact: same DOM, ids, classes and
 * data-* hooks the string/DOM builders in todos-list-render.mjs made. It draws a state from
 * todos-list-model.mjs; rows are keyed by todo id so a repaint keeps the row (and a focused text
 * field) on screen. A row that left the list is drawn once more as a leaving copy (class
 * row-exit / row-exit-done from motion.css) until its fade ends, then `h.onLeaveEnd` drops it.
 * Data rules, saving and the confirm dialogs stay in todos-list-render.mjs (`h` = its callbacks).
 */
import { useLayoutEffect, useRef } from 'preact/hooks';
import { placeLeaving, GROUP_META } from './todos-list-model.mjs';
import { todoPriorityLabel } from '../todos-priority.mjs';

/** wb-table grid — columns Prior. / Pendiente / Quién / Vence / (acción), mockup L416. */
// Pendiente keeps ≥ 10rem; Quién/Vence give way first (at a 720 px window the
// fixed 118/104 px columns squeezed the Pendiente text to zero width). The acción
// column fits «En curso» + «Listo» on one line. Narrow panels drop Quién
// (workbench-surfaces.css @container).
const OPEN_ROW_GRID = '62px minmax(10rem, 1fr) minmax(0, 118px) minmax(0, 104px) 104px';
/** Cerrados rows drop Prior. and the acción column. */
const CLOSED_ROW_GRID = 'minmax(10rem, 1fr) minmax(0, 118px) minmax(0, 104px)';
const OPEN_COLUMNS = ['Prior.', 'Pendiente', 'Quién', 'Vence', ''];

function TextInput({ row, h }) {
  const ref = useRef(null);
  // A repaint must not overwrite what is being typed: only follow the data while the field is not focused.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el !== document.activeElement && el.value !== row.text) el.value = row.text;
  }, [row.text]);
  return (
    <input
      ref={ref}
      type="text"
      class="todo-text-input"
      defaultValue={row.text}
      placeholder="Descripción del pendiente"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => h.onText(row.id, e.currentTarget)}
    />
  );
}

function OpenRow({ row, h }) {
  const ghost = !!row.leave;
  const cls = 'wb-row wb-todo-row wb-todo-row--prio-' + row.priority
    + (row.status === 'vencido' ? ' wb-row--alert' : '')
    + (row.handoff ? ' wb-todo-row--handoff' : '')
    + (row.enter ? ' row-enter' : '')
    + (ghost ? ' ' + row.leave : '');
  return (
    <div
      class={cls}
      data-todo-id={ghost ? undefined : row.id}
      style={{ gridTemplateColumns: OPEN_ROW_GRID }}
      onAnimationEnd={ghost ? () => h.onLeaveEnd(row.id) : undefined}
    >
      <button type="button" class={'wb-todo-prior wb-todo-prior--' + row.priority} title="Clic: cambiar prioridad" onClick={() => h.onPrio(row.id)}>
        {todoPriorityLabel(row.priority).toUpperCase()}
      </button>
      <span class="wb-todo-pendiente">
        <TextInput row={row} h={h} />
        {row.trigger && ' '}
        {row.trigger && <span class="wb-todo-trigger">{row.trigger}</span>}
      </span>
      <span class="wb-todo-quien" title={row.who}>{row.who}</span>
      <span class={'wb-todo-vence wb-todo-vence--' + row.status}>
        {row.vence}
        {row.bell && ' '}
        {row.bell && <span class="todo-remind-bell" aria-hidden="true">{String.fromCodePoint(0x1f514)}</span>}
      </span>
      <span class="wb-todo-accion">
        <button
          type="button"
          class={'wb-todo-encurso-btn' + (row.inProgress ? ' is-active' : '')}
          title={row.inProgress ? 'Quitar "en curso"' : 'Marcar como en curso'}
          aria-pressed={String(row.inProgress)}
          onClick={() => h.onInCurso(row.id)}
        >En curso</button>
        <button type="button" class="wb-todo-listo-btn" title="Marcar como resuelto" onClick={() => h.onListo(row.id)}>Listo</button>
        {row.handoff && (
          <button type="button" class="wb-todo-ack-btn" title="Marcar como recibido del turno anterior" onClick={() => h.onAck(row.id)}>Recibido</button>
        )}
        <button type="button" class="wb-todo-del-btn" title="Eliminar" onClick={() => h.onDel(row.id)}>×</button>
      </span>
    </div>
  );
}

/** Closed (listo) row: strikethrough text, no prior/acción columns. */
function ClosedRow({ row }) {
  return (
    <div class="wb-row wb-todo-row wb-todo-row--closed" data-todo-id={row.id} style={{ gridTemplateColumns: CLOSED_ROW_GRID }}>
      <span class="wb-todo-pendiente wb-todo-pendiente--closed">{row.text}</span>
      <span class="wb-todo-quien" title={row.who}>{row.who}</span>
      <span class="wb-todo-vence wb-todo-vence--listo">{row.vence}</span>
    </div>
  );
}

const Row = ({ row, h }) => (row.closed ? <ClosedRow row={row} /> : <OpenRow row={row} h={h} />);
const rowKey = (row) => (row.leave ? 'x:' : '') + row.id;

function Group({ group, h }) {
  const meta = GROUP_META[group.status] || GROUP_META.sin_fecha;
  const titleClass = 'wb-table-card-title' + (meta.titleClass ? ' ' + meta.titleClass : '');
  const Root = group.collapsed ? 'details' : 'div';
  const Head = group.collapsed ? 'summary' : 'div';
  const count = group.rows.length;
  return (
    <Root class={'todo-group wb-table-card todo-group--' + group.status.replace(/_/g, '-')}>
      <Head class={'todo-group-header wb-table-card-header' + (meta.headerClass ? ' ' + meta.headerClass : '')}>
        {group.status === 'listo' ? (
          <>
            <span class={titleClass}>{meta.title}</span>
            <span class="wb-todo-group-count">{count}</span>
          </>
        ) : (
          <span class={titleClass}>{meta.title + ' · ' + count}</span>
        )}
      </Head>
      {group.colhead && (
        <div class="wb-table-colhead" style={{ gridTemplateColumns: OPEN_ROW_GRID }}>
          {OPEN_COLUMNS.map((c) => <span>{c}</span>)}
        </div>
      )}
      <div class="wb-table-body">
        {group.items.map((row) => <Row key={rowKey(row)} row={row} h={h} />)}
      </div>
    </Root>
  );
}

function Toolbar({ chips, h }) {
  return (
    <div class="todo-toolbar">
      <div class="todo-filter-bar todo-segmented" role="tablist" aria-label="Filtrar pendientes">
        {chips.map((c) => (
          <button
            type="button"
            class={'todo-filter-chip' + (c.active ? ' is-active' : '')}
            data-filter={c.id}
            role="tab"
            aria-selected={c.active ? 'true' : 'false'}
            onClick={() => h.onChip(c.id)}
          >
            {c.label}
            <span class="todo-filter-count">{String(c.count)}</span>
          </button>
        ))}
      </div>
      <button type="button" class="todo-toolbar-add-btn" aria-haspopup="dialog" onClick={h.onAdd}>+ Pendiente</button>
    </div>
  );
}

function Empty({ title, lead }) {
  return (
    <div class="todo-empty" role="status">
      <span class="empty-state-title">{title}</span>
      <span class="empty-state-lead">{lead}</span>
    </div>
  );
}

/** @param {{ state: object, h: object }} props state from todos-list-model.mjs nextTodoListState */
export function TodoListView({ state, h }) {
  if (state.kind === 'nopatient') {
    return <Empty title="Elige un paciente para ver pendientes" lead="Selecciona uno en la lista de la izquierda." />;
  }
  const { groups, tail } = placeLeaving(state);
  const ghosts = tail.map((row) => <Row key={rowKey(row)} row={row} h={h} />);
  return (
    <>
      <Toolbar chips={state.model.chips} h={h} />
      {state.kind === 'empty' ? (
        <>
          {state.model.empty === 'handoff'
            ? <Empty title="Sin pendientes del turno anterior" lead="Los que quedaron abiertos al cerrar el turno previo aparecen aquí." />
            : <Empty title="Sin pendientes" lead="Los pendientes que agregues aparecen aquí." />}
          {ghosts}
        </>
      ) : (
        <div class="todo-list">
          {groups.map((g) => <Group key={g.status} group={g} h={h} />)}
          {ghosts}
        </div>
      )}
    </>
  );
}
