/**
 * «Nueva rotación» rejoin modal: lead text and sala picker options.
 * Preact: same markup the string builders in clinical-rotation-rejoin-modal.mjs wrote.
 */
import { render } from 'preact';

/** @param {{ elevated: boolean, sala?: string }} p */
export function RotationRejoinLead({ elevated, sala }) {
  if (elevated) {
    return (
      <p>Se archivaron los equipos del mes anterior{sala ? <> en <strong>{sala}</strong></> : null}. Confirma tu sala y <strong>publica los equipos nuevos</strong> en Mi rotación para que el resto se una.</p>
    );
  }
  return (
    <p>Hay <strong>nueva rotación</strong>: los equipos anteriores ya no están activos{sala ? <> (sala actual: <strong>{sala}</strong>)</> : null}. Tu líder de equipo o R4 ya publicó equipos nuevos en Nube — confirma tu sala y <strong>elige el tuyo</strong> en Mi rotación.</p>
  );
}

/** @param {{ salas: string[], current?: string }} p */
export function SalaOptions({ salas, current }) {
  return (
    <>
      <option value="">— Seleccionar sala —</option>
      {salas.map((s) => <option value={s} selected={s === current}>{s}</option>)}
    </>
  );
}

/** Draw lead and sala options; `lead` / `select` are the live nodes. */
export function drawRotationRejoin(lead, select, leadProps, salaProps) {
  if (lead) {
    render(null, lead);
    render(<RotationRejoinLead {...leadProps} />, lead);
  }
  if (select) {
    render(null, select);
    render(<SalaOptions {...salaProps} />, select);
  }
}
