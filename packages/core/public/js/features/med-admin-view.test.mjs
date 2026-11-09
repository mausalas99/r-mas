import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** Node cannot import .jsx: bundle the view like the renderer does, render it to a string. */
async function load() {
  const built = await esbuild.build({
    stdin: {
      contents: `import { renderToString } from 'preact-render-to-string';
        import { Panel, PrnModal } from './med-admin-view.jsx';
        export const panel = (p) => renderToString(<Panel {...p} />);
        export const modal = (p) => renderToString(<PrnModal {...p} />);`,
      resolveDir: dir,
      loader: 'jsx',
    },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', jsxImportSource: 'preact',
  });
  return import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
}

const med = { id: 'a1', nombreRaw: 'CEFTRIAXONA 1 G', viaRaw: 'IV', dosisRaw: '1 G', frecuenciaRaw: 'CADA 12 HORAS' };
const prn = { id: 'p1', nombreRaw: 'ONDANSETRON', viaRaw: 'IV', dosisRaw: '8 MG // CRITERIO PRN náusea', frecuenciaRaw: 'PRN' };
const medAdmin = { notAdmin: { 'a1|18:00': true }, hidden: {}, prnLog: { p1: ['10:30'] } };

test('grid keeps the hooks the click delegation and the E2E use', async () => {
  const { panel } = await load();
  const html = panel({ items: [med], times: ['06:00', '18:00'], medAdmin, fecha: '', prnCount: 1, hiddenItems: [prn], expanded: true });
  assert.match(html, /class="med-pharm-grid-scope med-admin-panel"/);
  assert.match(html, /data-med-admin-hide="a1"/);
  assert.match(html, /data-med-admin-key="a1\|06:00"[^>]*aria-pressed="true"/);
  assert.match(html, /class="day-pad indicated not-admin"[^>]*data-med-admin-key="a1\|18:00"[^>]*aria-pressed="false"/);
  assert.match(html, /data-med-admin-open-prn/);
  assert.match(html, /data-med-admin-unhide="p1"/);
  assert.match(html, /aria-expanded="true"/);
});

test('all hidden shows the notice; PRN modal lists the logged dose', async () => {
  const { panel, modal } = await load();
  assert.match(panel({ items: [], times: [], medAdmin, fecha: '', prnCount: 0, hiddenItems: [med], expanded: false }),
    /Todos los medicamentos con horario están ocultos\./);
  const html = modal({ prnItems: [prn], medAdmin });
  assert.match(html, /data-med-admin-prn-remove="p1\|10:30"/);
  assert.match(html, /data-med-admin-prn-register="p1"/);
});
