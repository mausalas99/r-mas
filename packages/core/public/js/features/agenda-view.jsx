/** Weekly procedure agenda board (head, hour column, day columns with event blocks). Model from agenda-panel-render.mjs. */
import { render } from 'preact';

export function AgendaBoard({ model, onEdit }) {
  const { rowPx } = model;
  return (
    <div>
      <div class="rpc-proc-agenda-board-head">
        <div class="rpc-proc-agenda-head-spacer"></div>
        {model.head.map((c) => (
          <div class={'rpc-proc-agenda-head-cell' + (c.isToday ? ' is-today' : '') + (c.isWeekend ? ' is-weekend' : '')}>
            <span>{c.wd}</span><strong>{c.day}</strong>
            {c.isToday ? <span class="rpc-proc-agenda-today-tag">hoy</span> : null}
          </div>
        ))}
      </div>
      <div class="rpc-proc-agenda-board-body">
        <div class="rpc-proc-agenda-times-col">
          {model.times.map((t) => <div class="rpc-proc-agenda-time-slot" style={{ height: rowPx + 'px' }}>{t}</div>)}
        </div>
        {model.cols.map((col) => (
          <div class="rpc-proc-agenda-day-col-wrap" style={{ height: col.height + 'px' }}>
            {col.bands.map((band) => <div class={'rpc-proc-agenda-hour-line' + (band ? ' is-band' : '')} style={{ height: rowPx + 'px' }}></div>)}
            {col.blocks.map((b) => (
              <button
                type="button"
                class={'rpc-proc-agenda-block' + (b.flagged ? ' rpc-proc-flag' : '')}
                style={{ top: b.top + 'px', height: b.height + 'px', left: b.left, width: b.width }}
                title={b.title}
                onClick={(e) => { e.preventDefault(); onEdit(b.id); }}
              >
                <div class="rpc-proc-name">{b.name}</div>
                <div class="rpc-proc-sub">{b.sub}</div>
                <div class="rpc-proc-pat">{b.patient}</div>
              </button>
            ))}
          </div>
        ))}
        {model.empty ? (
          <div class="rpc-proc-agenda-empty">
            <span class="rpc-proc-agenda-empty-title">Semana libre</span>
            <span>Usa + Procedimiento para agendar uno.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const drawn = new WeakSet();

/** Draw the board into `mount`; the first draw drops whatever the page had there. */
export function drawAgendaBoard(mount, model, onEdit) {
  if (!drawn.has(mount)) { mount.textContent = ''; drawn.add(mount); }
  render(<AgendaBoard model={model} onEdit={onEdit} />, mount);
}

/** Patient choices of the procedure modal. */
export function PatientOptions({ patients }) {
  return patients.map((p) => <option value={String(p.id)}>{String(p.nombre || p.id)}</option>);
}

export function drawPatientOptions(select, patients) {
  if (!drawn.has(select)) { select.textContent = ''; drawn.add(select); }
  render(<PatientOptions patients={patients} />, select);
}
