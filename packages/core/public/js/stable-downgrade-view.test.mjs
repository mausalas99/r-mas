import test from 'node:test';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { sameHtml } from './features/preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { DowngradeOptions } from './stable-downgrade-view.jsx';
  export const opts = (rows) => renderToString(<DowngradeOptions rows={rows} />);`);

// Markup of the createElement code in populateDowngradeSelect before the port, same inputs.
test('downgrade options equal the old DOM', () => {
  sameHtml(view.opts([]), '<option value="">Sin versiones anteriores</option>', 'empty');
  sameHtml(
    view.opts([
      { version: '8.3.0', text: '8.3.0', title: '8.3.0 — Release estable 8.3.0' },
      { version: '8.2.1', text: '8.2.1 — Correcciones', title: '8.2.1 — Correcciones' },
    ]),
    '<option value="8.3.0" title="8.3.0 — Release estable 8.3.0">8.3.0</option><option value="8.2.1" title="8.2.1 — Correcciones">8.2.1 — Correcciones</option>',
    'rows',
  );
});
