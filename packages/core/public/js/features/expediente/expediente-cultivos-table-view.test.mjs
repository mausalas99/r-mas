import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from '../preact-view-test-helpers.mjs';

// One bundle, so the table module, the scenarios and the app state share the same instances.
const m = await loadJsx(import.meta.url, `
  import { SCENARIOS, prepare } from './expediente-cultivos-table-scenarios.mjs';
  import { buildCultivosModel, cultivoRowsInDrawOrder } from './expediente-cultivos-table.mjs';
  import { CultivosTable } from './expediente-cultivos-table-view.jsx';
  export { SCENARIOS, prepare };
  export const html = (name) => {
    const s = prepare(name);
    if (!s.pid) return renderToString(<CultivosTable message="Selecciona un paciente." />);
    if (!s.rows.length) return renderToString(<CultivosTable message="No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinción Gram y cultivos de catéter enviados desde Laboratorio." />);
    const model = buildCultivosModel(s.pid, s.rows, s.pending || [], !!s.refreshBusy);
    // The view leaves the antibiogram cells empty; the table module fills them in draw order.
    const cells = cultivoRowsInDrawOrder(model).map((r) => r.atbHtml);
    let i = 0;
    return renderToString(<CultivosTable model={model} />).replace(/<td class="cultivos-cell-atb"><\\/td>/g, () => '<td class="cultivos-cell-atb">' + cells[i++] + '</td>');
  };`);

// Exact markup the string builders made before the port (captured from the old code).
const OLD = JSON.parse(fs.readFileSync(new URL('./expediente-cultivos-table-view.old.json', import.meta.url), 'utf8'));

// Preact leaves '>' unescaped in text and attributes and writes an empty class bare; HTML parses both the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/ class(?=[ >])/g, ' class=""');

for (const name of Object.keys(m.SCENARIOS)) {
  test(`cultivos table HTML equals the old builders: ${name}`, () => {
    assert.equal(norm(m.html(name)), norm(OLD[name]));
  });
}
