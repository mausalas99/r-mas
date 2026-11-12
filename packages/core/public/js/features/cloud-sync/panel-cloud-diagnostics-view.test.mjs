import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import { DASH_SCENARIOS } from './panel-overlays-scenarios.mjs';
import OLD from './panel-cloud-diagnostics-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { NubeDashboard } from './panel-cloud-diagnostics-view.jsx';
  export const dash = (v) => renderToString(<NubeDashboard view={v} />);`);

// The old strings self-closed SVG shapes; HTML parses both the same.
const open = (h) => h.replace(/<(path|circle)([^>]*?)\/>/g, '<$1$2></$1>');

for (const [name, v] of Object.entries(DASH_SCENARIOS)) {
  test('dashboard ' + name + ' equals the old HTML', () => sameHtml(view.dash(v), open(OLD[name]), name));
}
