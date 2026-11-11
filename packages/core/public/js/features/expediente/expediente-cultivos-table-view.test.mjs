import test from 'node:test';
import assert from 'node:assert/strict';
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

for (const name of Object.keys(m.SCENARIOS)) {
  const s = m.prepare(name);
  test(`cultivos table ${name}: no patient shows the prompt`, { skip: !!s.pid ? 'has patient' : false }, () => {
    assert.match(m.html(name), /Selecciona un paciente\./);
  });
  test(`cultivos table ${name}: patient with no cultures shows the empty message`, { skip: !(s.pid && !s.rows.length) }, () => {
    assert.match(m.html(name), /No hay cultivos en el historial/);
  });
  test(`cultivos table ${name}: every antibiogram cell is filled`, { skip: !(s.pid && s.rows.length) }, () => {
    const html = m.html(name);
    assert.match(html, /<table/);
    assert.doesNotMatch(html, /cultivos-cell-atb"><\/td>/);
  });
}
