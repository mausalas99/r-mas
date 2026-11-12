/** Registro rows of the new-patient modal. Preact: same rows and data-on* hooks the string builder wrote. */
import { render } from 'preact';

export function RegistroRows({ rows, multi }) {
  return rows.map((val, i) => {
    const canRemove = multi && rows.length > 1;
    const arg = '[' + i + ']';
    return (
      <div class="vpo-dx-row list-row">
        <input type="text" class="ea-input m-registro-row-input" value={val} placeholder={multi ? 'Registro ' + (i + 1) : '0000000-0'} data-oninput="onRegistroModalInput" data-oninput-args={arg} data-oninput-pass="value" data-onpaste="onRegistroModalRowPaste" data-onpaste-args={arg} data-onpaste-pass="event" />
        <button type="button" class="btn-remove" data-onclick="removeRegistroModalRow" data-onclick-args={arg} style={canRemove ? undefined : 'visibility:hidden'} aria-label="Eliminar">×</button>
      </div>
    );
  });
}

/** Replace the list's rows (fresh nodes, like the old `innerHTML =`). */
export function drawRegistroRows(host, props) {
  render(null, host);
  host.textContent = '';
  render(<RegistroRows {...props} />, host);
}
