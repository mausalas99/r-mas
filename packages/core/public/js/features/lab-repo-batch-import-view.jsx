/**
 * Lab-repo batch modal drawing (patient checklist + the inline chemistry skeleton). Preact: same DOM,
 * classes and data-patient-id hook the string builders in lab-repo-batch-import.mjs made. The data
 * rules, the busy flag and the change handler stay in that module. Every draw unmounts first, so the
 * DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

const CHEM_CELLS = ['K', 'Cr', 'BUN', 'Hb'];

function RowMeta({ row }) {
  if (!row.hasRegistro) return <span class="lab-repo-batch-row-warn">Sin registro — se omite</span>;
  return (
    <>
      <span class="lab-repo-batch-row-reg">{'Reg. ' + row.registro}</span>
      {row.hint ? <span class="lab-repo-batch-row-loc">{row.hint}</span> : null}
    </>
  );
}

function Row({ row, busy }) {
  return (
    <label class={'lab-repo-batch-row' + (row.hasRegistro ? '' : ' lab-repo-batch-row--disabled')}>
      <input
        type="checkbox"
        class="lab-repo-batch-check"
        data-patient-id={row.id}
        checked={!!row.selected}
        disabled={!row.hasRegistro || busy}
      />
      <span class="lab-repo-batch-row-text">
        <span class="lab-repo-batch-row-name" title={row.nombre}>{row.nombre}</span>
        <span class="lab-repo-batch-row-meta"><RowMeta row={row} /></span>
      </span>
    </label>
  );
}

/** @param {{ rows: object[], busy: boolean }} props */
export function LabRepoBatchList({ rows, busy }) {
  if (!rows.length) {
    return <p class="lab-repo-batch-empty">No hay pacientes en tu equipo (o aún no hay asignaciones).</p>;
  }
  return <>{rows.map((row) => <Row row={row} busy={busy} />)}</>;
}

/** Teal workbench §11c "Cargando labs": K / Cr / BUN / Hb shimmer grid, staggered 0.1s. */
export function LabChemistrySkeleton() {
  return (
    <div class="lab-chem-skel" aria-busy="true" aria-label="Cargando labs">
      {CHEM_CELLS.map((label, i) => (
        <div class="lab-chem-skel-cell">
          <span class="lab-chem-skel-label">{label}</span>
          <span class="lab-chem-skel-bar" style={'--lab-chem-skel-delay:' + i * 0.1 + 's'}></span>
        </div>
      ))}
    </div>
  );
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  if (vnode) render(vnode, host);
}

export const drawLabRepoBatchList = (host, rows, busy) => draw(host, <LabRepoBatchList rows={rows} busy={busy} />);
export const drawLabRepoBatchProgress = (host, visible) => draw(host, visible ? <LabChemistrySkeleton /> : null);
