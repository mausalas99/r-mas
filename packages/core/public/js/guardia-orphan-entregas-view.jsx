/**
 * Guardia «Entregas sin expediente local» strip. Preact: same DOM the string builder in
 * guardia-orphan-entregas.mjs made. That file keeps the data rules and the open / delete flows; the
 * buttons carry data-patient-id / data-guardia-id and pass themselves to the handlers. Every draw
 * unmounts and empties the host first, so the DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

/** Plain rows for the strip. `vitalsHintFor(row)` is the vitals line shown under each id. */
export function orphanStripRows(list, vitalsHintFor) {
  return list.map((row) => {
    const patientId = String(row.patient_id || '');
    return {
      patientId,
      guardiaId: String(row.guardia_id || ''),
      shortId: patientId.length > 14 ? `${patientId.slice(0, 6)}…${patientId.slice(-4)}` : patientId,
      vitalsHint: vitalsHintFor(row),
    };
  });
}

export function OrphanStrip({ rows, onOpen, onDelete }) {
  return (
    <details class="guardia-orphan-details" open>
      <summary class="guardia-orphan-summary">
        Entregas sin expediente local{' '}
        <span class="guardia-orphan-count">{rows.length}</span>
      </summary>
      <p class="guardia-orphan-hint">
        Estas entregas siguen en ⇄ pero el paciente ya no está en tu censo.
        Abrir recupera el expediente del anfitrión cuando sea posible; Eliminar del servidor borra el paciente en ⇄ y libera la entrega.
      </p>
      <ul class="guardia-orphan-list">
        {rows.map((r) => (
          <li class="guardia-orphan-row">
            <div class="guardia-orphan-row-main">
              <span class="guardia-orphan-id" title={r.patientId}>{r.shortId}</span>
              <span class="guardia-orphan-vitals">{r.vitalsHint}</span>
            </div>
            <div class="guardia-orphan-row-actions">
              <button type="button" class="wb-btn wb-btn-secondary guardia-orphan-open-btn"
                data-patient-id={r.patientId} data-guardia-id={r.guardiaId}
                onClick={(ev) => onOpen(ev.currentTarget)}>Abrir</button>
              <button type="button" class="wb-btn wb-btn-danger-outline guardia-orphan-delete-btn"
                data-patient-id={r.patientId} data-guardia-id={r.guardiaId}
                onClick={(ev) => onDelete(ev.currentTarget)}>Eliminar del servidor</button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function drawOrphanStrip(host, rows, onOpen, onDelete) {
  render(null, host);
  host.textContent = '';
  render(<OrphanStrip rows={rows} onOpen={onOpen} onDelete={onDelete} />, host);
}

export function clearOrphanStrip(host) {
  render(null, host);
  host.textContent = '';
}
