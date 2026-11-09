import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ENTRIES = [{"value":"120/80","unit":"mmHg","stamp":"09/11 08:00","altered":false},{"value":"150/95","unit":"mmHg","stamp":"08/11 20:00","altered":true},{"value":"<b>x</b> & \"q\"","unit":"","stamp":"","altered":false}];
const TURNOS = {"ingTurnos":[100,200,"NC"],"egrTurnos":[50,300,null],"eventos":[{"turno":"t1","kind":"hemodialisis","ml":2000},{"turno":"t1","kind":"otro","detail":"Rx <torax>"}]};
// Output of the old string builders (renderVitalHistoryListHtml / renderTurnosBalanceHtml) for the same input.
const OLD = {
  "empty": "<p class=\"ea-muted\">Sin lecturas registradas.</p>",
  "list": "<ol class=\"ea-vital-history-list\"><li class=\"ea-vital-history-row ea-vital-history-row--latest\"><div class=\"ea-vital-history-metric\"><span class=\"ea-vital-history-value\">120/80</span><span class=\"ea-vital-history-unit\">mmHg</span></div><div class=\"ea-vital-history-meta\"><span class=\"ea-vital-history-stamp\">09/11 08:00</span><span class=\"ea-vital-history-badge\">Actual</span></div></li><li class=\"ea-vital-history-row ea-vital-history-row--altered\"><div class=\"ea-vital-history-metric\"><span class=\"ea-vital-history-value\">150/95</span><span class=\"ea-vital-history-unit\">mmHg</span></div><div class=\"ea-vital-history-meta\"><span class=\"ea-vital-history-stamp\">08/11 20:00</span></div></li><li class=\"ea-vital-history-row\"><div class=\"ea-vital-history-metric\"><span class=\"ea-vital-history-value\">&lt;b&gt;x&lt;/b&gt; &amp; &quot;q&quot;</span></div><div class=\"ea-vital-history-meta\"></div></li></ol>",
  "turnosNull": "<table class=\"ea-turnos-table\"><thead><tr><th>Turno</th><th>Ingresos</th><th>Egresos</th><th>Balance</th><th>Eventos</th></tr></thead><tbody><tr><th scope=\"row\">T1</th><td>—</td><td>—</td><td class=\"ea-turnos-bal\">—</td><td class=\"ea-turnos-events\"></td></tr><tr><th scope=\"row\">T2</th><td>—</td><td>—</td><td class=\"ea-turnos-bal\">—</td><td class=\"ea-turnos-events\"></td></tr><tr><th scope=\"row\">T3</th><td>—</td><td>—</td><td class=\"ea-turnos-bal\">—</td><td class=\"ea-turnos-events\"></td></tr></tbody></table><p class=\"ea-muted ea-turnos-foot\">Aún no hay ingresos ni egresos por turno.</p><button type=\"button\" class=\"ea-btn ea-turnos-add\" data-onclick=\"closeEaVitalHistoryModal\" data-onclick-2=\"openEstadoActualRegistroModal\">Capturar turnos o evento</button>",
  "turnosFull": "<table class=\"ea-turnos-table\"><thead><tr><th>Turno</th><th>Ingresos</th><th>Egresos</th><th>Balance</th><th>Eventos</th></tr></thead><tbody><tr><th scope=\"row\">T1</th><td>100</td><td>50</td><td class=\"ea-turnos-bal ea-balance-live--pos\">+50</td><td class=\"ea-turnos-events\">HEMODIÁLISIS, UF 2000 ML<br>OTRO RX &lt;TORAX&gt;</td></tr><tr><th scope=\"row\">T2</th><td>200</td><td>300</td><td class=\"ea-turnos-bal ea-balance-live--neg\">-100</td><td class=\"ea-turnos-events\"></td></tr><tr><th scope=\"row\">T3</th><td>NC</td><td>—</td><td class=\"ea-turnos-bal\">NC</td><td class=\"ea-turnos-events\"></td></tr></tbody></table><p class=\"ea-muted ea-turnos-foot\">Valores en mL del último registro.</p><button type=\"button\" class=\"ea-btn ea-turnos-add\" data-onclick=\"closeEaVitalHistoryModal\" data-onclick-2=\"openEstadoActualRegistroModal\">Capturar turnos o evento</button>"
};

/** Node cannot import .jsx: bundle the views like the renderer does, render them to strings. */
async function render(expr) {
  const built = await esbuild.build({
    stdin: {
      contents: `import { renderToString } from 'preact-render-to-string';
        import { VitalHistoryList, TurnosBalance } from './estado-actual-vital-history-view.jsx';
        export const html = (entries, turnos) => renderToString(${expr});`,
      resolveDir: dir,
      loader: 'jsx',
    },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', jsxImportSource: 'preact',
  });
  const mod = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
  return mod.html;
}

// Same markup, two spellings: Preact prints <br/> and a bare >; the old strings printed <br> and &gt;.
const same = (s) => s.replace(/<br\s*\/>/g, '<br>').replace(/&gt;/g, '>');

test('Historial list: same HTML as the old string builder', async () => {
  const html = await render('<VitalHistoryList entries={entries} />');
  assert.equal(same(html(ENTRIES)), same(OLD.list));
  assert.equal(same(html([])), same(OLD.empty));
});

test('Balance por turno: same HTML as the old string builder', async () => {
  const html = await render('<TurnosBalance turnos={turnos} />');
  assert.equal(same(html(ENTRIES, TURNOS)), same(OLD.turnosFull));
  assert.equal(same(html(ENTRIES, null)), same(OLD.turnosNull));
});
