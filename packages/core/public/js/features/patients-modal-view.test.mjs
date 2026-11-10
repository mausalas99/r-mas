import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { IcServiceButtons } from './patients-modal-view.jsx';
  export const html = (names, selected) => renderToString(<IcServiceButtons names={names} selected={selected} onPick={() => {}} />);`);

// Exact markup the DOM loop in fillIcAdmitFields/pickIcService left in #m-ic-svc before the port.
const OLD = JSON.parse(fs.readFileSync(new URL('./patients-modal-old-html.json', import.meta.url), 'utf8'));
// Preact escapes '>' and quotes in text; HTML parses both the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/&quot;/g, '"');

for (const [key, sel] of [['sel:none', ''], ['sel:first', OLD.names[0]], ['sel:odd', OLD.names[1]], ['sel:unknown', 'zzz']]) {
  test('IC service buttons match the old markup: ' + key, () => {
    assert.equal(norm(view.html(OLD.names, sel)), OLD[key]);
  });
}

test('no names draws nothing', () => {
  assert.equal(view.html([], ''), '');
});
