/**
 * Body of the «Inicio de turno» window (`.wb-it-window`). Preact (Phase 3): same DOM, ids, classes and
 * data-* hooks the string builders in workbench/ (mode-frame, counters-band, wb-table, filter-chips,
 * empty-state) made. The scrim, Esc and open/close stay in inicio-turno-panel.mjs; this view is pure:
 * the panel computes the numbers and rows and passes them in, with the callbacks.
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import { Button } from '../../ui-kit/kit.jsx';
import { zonesFooterNote } from './inicio-turno-zones.mjs';

const LO_PRIMERO_GRID = '92px 1fr 128px 96px';
const plural = (n, one, many = `${one}s`) => (n === 1 ? one : many);

function ModeFrame({ context, total, onClose }) {
  return (
    <div class="wb-mode-frame">
      <div class="wb-mode-frame-left">
        <span class="wb-mode-frame-name">Inicio de turno</span>
        {context ? <span class="wb-mode-frame-context">{context}</span> : null}
      </div>
      <div class="wb-mode-frame-actions">
        <Button class="wb-btn-secondary" data-wb-secondary="0" onClick={onClose}>Censo completo</Button>
        <Button class="wb-btn-secondary wb-btn-shortcut" data-wb-shortcut="">⌘/</Button>
        <Button primary data-wb-primary="" onClick={onClose}>{`Recibir ${total} ${plural(total, 'paciente')}`}</Button>
      </div>
    </div>
  );
}

function Counter({ label, figure, detail, tone, progress }) {
  const alert = tone === 'alert';
  const pct = progress ? Math.max(0, Math.min(100, Number(progress.percent) || 0)) : null;
  return (
    <div class={alert ? 'wb-counter-cell wb-counter-cell--alert' : 'wb-counter-cell'}>
      <div class="wb-counter-text">
        <span class={alert ? 'wb-counter-label wb-counter-label--alert' : 'wb-counter-label'}>{label}</span>
        <span class="wb-counter-figure">
          {figure}
          {detail ? <span class={alert ? 'wb-counter-detail wb-counter-detail--alert' : 'wb-counter-detail'}>{` · ${detail}`}</span> : null}
        </span>
      </div>
      {pct === null ? null : (
        <div class="wb-counter-progress">
          <div class="wb-counter-progress-fill progress-sweep-fill" style={`width:${pct}%`}></div>
        </div>
      )}
    </div>
  );
}

function Counters({ heredas, signos, ingresos }) {
  const cells = [
    {
      label: 'Heredas pendientes',
      figure: `${heredas.open} ${plural(heredas.open, 'abierto')}`,
      detail: heredas.overdue > 0 ? `${heredas.overdue} ${plural(heredas.overdue, 'vencido')}` : '',
      tone: 'alert',
    },
    {
      label: 'Toma de signos',
      figure: `${signos.receivedToday} de ${signos.total} recibidos`,
      progress: { percent: signos.percent },
    },
    {
      label: 'Ingresos de la noche',
      figure: `${ingresos.admittedToday} ${plural(ingresos.admittedToday, 'nuevo')}`,
      detail: ingresos.incompleteChart > 0 ? `${ingresos.incompleteChart} con ficha incompleta` : '',
    },
  ];
  return <div class="wb-counters-band">{cells.map((c) => <Counter {...c} />)}</div>;
}

function LoPrimeroRow({ row, onOpenPatient }) {
  const since = row.urgency === 'vencido' ? 'wb-it-since--vencido' : row.urgency === 'en_espera' ? 'wb-it-since--espera' : 'wb-it-since--curso';
  const cells = [
    <span class="wb-it-bed">{row.bedLabel}</span>,
    <div class="wb-it-row-lines">
      <span class="wb-it-row-name">
        {row.name}{' '}<span class="wb-it-line-muted">{[row.ageLabel, row.stayLabel].filter(Boolean).join(' · ')}</span>
      </span>
      <span class="wb-it-row-reason">
        {row.alteredText ? <>{`${row.reasonText} · `}<span class="wb-it-altered">{row.alteredText}</span></> : row.reasonText}
      </span>
    </div>,
    <span class={`wb-it-since ${since}`}>{row.sinceLabel}</span>,
    <Button
      primary={row.action.tone === 'primary'}
      class={row.action.tone === 'primary' ? '' : 'wb-btn-secondary'}
      data-it-row-action={row.id}
      onClick={(ev) => { ev.stopPropagation(); onOpenPatient(row.id); }}
    >{row.action.label}</Button>,
  ];
  const cls = 'wb-row' + (row.urgency === 'vencido' ? ' wb-row--alert' : '') + ' wb-row--twoline';
  return (
    <div class={cls} style={`--wb-grid:${LO_PRIMERO_GRID}`} data-wb-row-id={row.id}>
      {cells.map((c) => <span class="wb-cell">{c}</span>)}
    </div>
  );
}

function LoPrimero({ lo, onOpenPatient }) {
  const { rows, remainingCount, totalCount } = lo;
  const summary = rows.length
    ? `${remainingCount} ${plural(remainingCount, 'paciente')} sin nada urgente al recibir`
    : `Los ${totalCount} pacientes están sin nada urgente al recibir`;
  return (
    <div class="wb-table-card wb-it-table-card">
      <div class="wb-table-card-header">
        <span class="wb-table-card-title">{`Lo primero · ${rows.length} ${plural(rows.length, 'cama')}`}</span>
        <div class="wb-table-card-actions"><span class="wb-it-table-sub">{`de ${totalCount}`}</span></div>
      </div>
      <div class="wb-table-colhead" style={`--wb-grid:${LO_PRIMERO_GRID}`}>
        {['Cama', 'Por qué', 'Desde', 'Acción'].map((c) => <span>{c}</span>)}
      </div>
      <div class="wb-table-body">{rows.map((r) => <LoPrimeroRow row={r} onOpenPatient={onOpenPatient} />)}</div>
      <div class="wb-table-summary">{summary}</div>
    </div>
  );
}

function EmptyState({ label, missing, whenArrives, exitLabel, onExit }) {
  return (
    <div class="wb-empty-state">
      <p class="wb-empty-label">{label}</p>
      <p class="wb-empty-missing">{missing}</p>
      <p class="wb-empty-when">{whenArrives}</p>
      {exitLabel ? <a class="wb-empty-exit" href="#" data-wb-empty-exit="" onClick={onExit}>{exitLabel}</a> : null}
    </div>
  );
}

function Zonas({ zones, initialSelected, onZonesChange }) {
  const [selected, setSelected] = useState(initialSelected);
  if (!zones.length) {
    return (
      <EmptyState
        label="Tus zonas hoy"
        missing="Ningún paciente del censo tiene un área asignada todavía."
        whenArrives="Se llenan solas en cuanto se registre el área de cada paciente."
      />
    );
  }
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((z) => z !== id) : [...selected, id];
    setSelected(next);
    onZonesChange(next);
  };
  return (
    <div class="wb-table-card wb-it-zonas-card">
      <div class="wb-table-card-header"><span class="wb-table-card-title">Tus zonas hoy</span></div>
      <div class="wb-it-zonas-body">
        <p class="wb-it-zonas-hint">Elige las zonas que revisas tú. Filtran el censo mientras dure el turno.</p>
        <div class="wb-chips">
          {zones.map((z) => {
            const on = selected.includes(z.id);
            return (
              <button type="button" class={on ? 'wb-chip wb-chip--active-teal' : 'wb-chip'} data-wb-chip-id={z.id} aria-pressed={String(on)} onClick={() => toggle(z.id)}>
                {`${z.label} · ${z.count}`}
              </button>
            );
          })}
        </div>
        <p class="wb-it-zonas-footer">{zonesFooterNote(selected)}</p>
      </div>
    </div>
  );
}

/**
 * @param {{ context: string, total: number, heredas: object, signos: object, ingresos: object,
 *   lo: { rows: object[], remainingCount: number, totalCount: number }, zones: object[], initialZones: string[],
 *   onZonesChange: (ids: string[]) => void, onClose: () => void, onOpenPatient: (id: string) => void,
 *   onOpenLab: () => void, onOpenInterconsulta: () => void }} props
 */
export function InicioTurnoBody(p) {
  return (
    <>
      <div id="inicio-turno-mode-frame"><ModeFrame context={p.context} total={p.total} onClose={p.onClose} /></div>
      <div id="inicio-turno-counters"><Counters heredas={p.heredas} signos={p.signos} ingresos={p.ingresos} /></div>
      <div class="wb-it-body">
        <div class="wb-it-col wb-it-col-left">
          <div id="inicio-turno-lo-primero" class="wb-it-lo-primero"><LoPrimero lo={p.lo} onOpenPatient={p.onOpenPatient} /></div>
          <div id="inicio-turno-entrega">
            <EmptyState
              label="Entrega de la guardia saliente"
              missing="R+ todavía no guarda un resumen de texto libre de la guardia que entrega."
              whenArrives="Se habilita cuando exista un campo de entrega de turno en R+; mientras tanto, revisa los pendientes heredados arriba."
            />
          </div>
        </div>
        <div class="wb-it-col wb-it-col-right">
          <div id="inicio-turno-zonas"><Zonas zones={p.zones} initialSelected={p.initialZones} onZonesChange={p.onZonesChange} /></div>
          <div id="inicio-turno-internos">
            <EmptyState
              label="Internos del turno"
              missing="R+ no tiene un rol de interno ni una asignación de zona/camas por interno todavía."
              whenArrives="Se habilita cuando exista ese modelo de datos; por ahora, coordina la cobertura fuera de la app."
            />
          </div>
          <div id="inicio-turno-labs-empty">
            <EmptyState
              label="Labs de hoy"
              missing="Todavía no hay resultados de hoy."
              whenArrives="Aparecen aquí y en cada paciente en cuanto se registran en R+."
              exitLabel="Abrir laboratorio"
              onExit={p.onOpenLab}
            />
          </div>
          <div id="inicio-turno-ic-empty">
            <EmptyState
              label="Interconsultas"
              missing="Sin solicitudes nuevas para revisar aquí."
              whenArrives="Las que ya estén en seguimiento siguen disponibles en el modo Interconsultas."
              exitLabel="Abrir modo interconsultas"
              onExit={p.onOpenInterconsulta}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/** Fresh render each open (null first) so the zone chips restart from the saved preference. */
export function drawInicioTurno(host, props) {
  render(null, host);
  render(<InicioTurnoBody {...props} />, host);
}
