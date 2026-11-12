/** Options of the stable-downgrade <select>. Preact: same DOM the createElement code in stable-downgrade-ui.mjs made. */
import { render } from 'preact';

/** `rows` is [{ version, text, title }]; no rows shows the empty option. */
export function DowngradeOptions({ rows }) {
  if (!rows.length) return <option value="">Sin versiones anteriores</option>;
  return <>{rows.map((r) => <option value={r.version} title={r.title}>{r.text}</option>)}</>;
}

/** Empty the select, then draw its options. */
export function drawDowngradeOptions(select, rows) {
  render(null, select);
  select.textContent = '';
  render(<DowngradeOptions rows={rows} />, select);
}
