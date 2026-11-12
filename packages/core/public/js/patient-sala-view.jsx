/** Sala <option>s for the new-patient modal. Preact: same options the string builder wrote. */
import { render } from 'preact';

export function SalaOptions({ selected, values }) {
  const sel = String(selected || '').trim();
  return (
    <>
      <option value="">— Seleccionar —</option>
      {values.map((s) => <option value={s} selected={s === sel}>{s}</option>)}
    </>
  );
}

/** Replace the select's options (fresh nodes, like the old `innerHTML =`). */
export function drawSalaOptions(select, props) {
  render(null, select);
  select.textContent = '';
  render(<SalaOptions {...props} />, select);
}
