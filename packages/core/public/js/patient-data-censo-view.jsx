/** Diagnóstico rows of the Datos tab. Preact: same rows and data-on* hooks the string builder wrote. */
import { render } from 'preact';

export function DxRows({ rows }) {
  return rows.map((dx, i) => {
    const n = i + 1;
    const arg = '[' + i + ']';
    return (
      <li>
        <label class="exp-datos-list__n" for={'patient-dx-' + n}>{n}</label>
        <input type="text" id={'patient-dx-' + n} class="exp-datos-q" value={dx} placeholder={dx ? undefined : 'Diagnóstico · pegar DX1 + DX2'} aria-label={'Diagnóstico ' + n} style="text-transform:uppercase;" data-oninput="onPatientDxInput" data-oninput-args={arg} data-oninput-pass="value" data-onpaste="splitPatientDxPaste" data-onpaste-args={arg} data-onpaste-pass="event" data-onkeydown="addPatientDxRow" data-onkeydown-keys="Enter" />
        {rows.length > 1 && <button type="button" class="exp-datos-list__rm" data-onclick="removePatientDxRow" data-onclick-args={arg} aria-label={'Quitar diagnóstico ' + n}>×</button>}
      </li>
    );
  });
}

/** Replace the list's rows (fresh nodes, like the old `innerHTML =`). */
export function drawDxRows(host, props) {
  render(null, host);
  host.textContent = '';
  render(<DxRows {...props} />, host);
}
