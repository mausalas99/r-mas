import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { stepRequiresUserAction } from '../../tour-targets.mjs';

// tour-flow-fundamentos-steps.mjs pulls in UI modules that expect a browser: give them a bare one.
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.document = { addEventListener() {}, documentElement: { classList: { toggle() {}, add() {}, remove() {} } }, querySelector: () => null, querySelectorAll: () => [], readyState: 'complete', getElementById: () => null };
const view = await loadJsx(import.meta.url, `export { nextButtonMode } from './tour-flow-fundamentos-steps.mjs';
  import { FundamentosBody, QuickRouteBody, TourBadge } from './tour-flow-views.jsx';
  export const body = (p) => renderToString(<FundamentosBody {...p} />);
  export const quick = (stepId) => renderToString(<QuickRouteBody stepId={stepId} />);
  export const badge = (p) => renderToString(<TourBadge {...p} />);`);

// Exact markup the dock got before the port, one entry per branch|key|density|app|step (captured from the old code
// by driving renderTourStep over every step of every branch; variant entries only where the copy differs).
const OLD = JSON.parse(fs.readFileSync(new URL('./tour-flow-views.old.json', import.meta.url), 'utf8'));
// Preact escapes quotes and '>' in text; HTML parses both the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const LIVESYNC = '<strong>R+ Cloud</strong> (icono <strong>⇄</strong> / Wi‑Fi junto a Ajustes)';
const MOBILE = 'La app móvil (iPad/Safari) muestra tablero de guardia y expediente esencial; no incluye Ajustes, exportaciones Word ni todas las pestañas de escritorio.';

let bodies = 0;
let badges = 0;
for (const [key, old] of Object.entries(OLD)) {
  const [branch, mod, dens, app, id] = key.split('|');
  if (old.body !== undefined && !id.startsWith('gv7_')) {
    bodies++;
    test(`${key}: step body equals the old HTML`, () => {
      const got = branch === 'quick-route'
        ? view.quick(id)
        : view.body({ stepId: id, mod, dense: dens !== 'normal', interconsulta: branch === 'interconsulta', desktop: app === 'desk', livesyncBtn: LIVESYNC, mobileScope: MOBILE });
      assert.equal(norm(got), old.body);
    });
  }
  if (old.badge !== undefined) {
    badges++;
    test(`${key}: step badge equals the old HTML`, () => {
      assert.equal(norm(view.badge({ branch, prog: old.prog, idx: old.idx, total: old.total })), old.badge);
    });
  }
}

test('the fixture covers every step type', () => {
  assert.ok(bodies > 60, `bodies ${bodies}`);
  assert.ok(badges >= 4, `badges ${badges}`);
  const ids = new Set(Object.keys(OLD).map((k) => k.split('|')[4]));
  for (const id of ['map_tabs', 'ic_exports', 'livesync_desktop', 'wrap', 'quick_wrap', 'lab_parse']) assert.ok(ids.has(id), id);
});

test('Siguiente button state per Fundamentos step equals the old one', () => {
  let n = 0;
  for (const [key, old] of Object.entries(OLD)) {
    const [branch, , , , id] = key.split('|');
    if (!old.next || (branch !== 'sala' && branch !== 'interconsulta') || key.split('|')[1] !== '⌘') continue;
    const mode = view.nextButtonMode(id);
    assert.ok(mode, id);
    const hidden = mode === 'hide' || (stepRequiresUserAction(id) && id !== 'servicio_default');
    assert.equal(old.next[0], hidden ? 'none' : '', `${key} display`);
    if (mode === 'finish') assert.deepEqual(old.next.slice(1), ['Finalizar', 'guidedTourFinish()']);
    n++;
  }
  assert.ok(n > 30);
});
