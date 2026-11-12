/** Acceso rows of the Datos tab. Preact: same rows and data-on* hooks the string builder wrote. */
import { render } from 'preact';

/** rows: [{ via, dateValue }] (dateValue is the yyyy-mm-dd the date input shows, or ''). */
export function AccesoRows({ rows, viaLabels, now }) {
  return rows.map((row, i) => {
    const name = 'Acceso' + (rows.length > 1 ? ' ' + (i + 1) : '');
    const arg = '[' + i + ']';
    const v = String(row.via || '');
    const days = row.dateValue ? Math.floor((now - new Date(row.dateValue + 'T00:00:00').getTime()) / 86400000) : -1;
    return (
      <div class="exp-datos-prop patient-acceso-row">
        <span class="exp-datos-prop__k">{name}</span>
        <div class="exp-datos-acc">
          <select class="exp-datos-q patient-acceso-via" data-onchange="onPatientAccesoVia" data-onchange-args={arg} data-onchange-pass="value" aria-label="Vía de acceso">
            <option value="" selected={!v}>— Vía —</option>
            {Object.keys(viaLabels).map((key) => <option value={key} selected={v === key}>{viaLabels[key]}</option>)}
          </select>
          <label class="exp-datos-acc__date"><span class="visually-hidden">Fecha {name}</span>
            <input type="date" class="rpc-date-input patient-acceso-fecha" value={row.dateValue} data-oninput="onPatientAccesoFecha" data-oninput-args={arg} data-oninput-pass="value" />
          </label>
          {days >= 0 && <span class="exp-datos-tag exp-datos-tag--muted">día {days}</span>}
          {rows.length > 1 && <button type="button" class="exp-datos-list__rm" data-onclick="removePatientAccesoRow" data-onclick-args={arg} aria-label={'Quitar ' + name}>×</button>}
        </div>
      </div>
    );
  });
}

/** Replace the list's rows (fresh nodes, like the old `innerHTML =`). */
export function drawAccesoRows(host, props) {
  render(null, host);
  host.textContent = '';
  render(<AccesoRows {...props} />, host);
}
