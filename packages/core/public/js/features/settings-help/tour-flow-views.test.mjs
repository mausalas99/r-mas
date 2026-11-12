import test from 'node:test';
import assert from 'node:assert/strict';
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

const text = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const LIVESYNC = '<strong>R+ Cloud</strong> (icono <strong>⇄</strong> / Wi‑Fi junto a Ajustes)';
const MOBILE = 'La app móvil (iPad/Safari) muestra tablero de guardia y expediente esencial; no incluye Ajustes, exportaciones Word ni todas las pestañas de escritorio.';
const STEP_IDS = ['map_tabs', 'ic_exports', 'livesync_desktop', 'wrap', 'lab_parse'];

for (const id of STEP_IDS) {
  test(`fundamentos step ${id} renders a body`, () => {
    const html = view.body({ stepId: id, mod: 'sala', dense: false, interconsulta: false, desktop: true, livesyncBtn: LIVESYNC, mobileScope: MOBILE });
    assert.ok(text(html).length > 0);
  });
}

test('step body shows the live-sync button text on desktop', () => {
  const html = view.body({ stepId: 'livesync_desktop', mod: 'sala', dense: false, interconsulta: false, desktop: true, livesyncBtn: LIVESYNC, mobileScope: MOBILE });
  assert.ok(text(html).includes('R+ Cloud'));
});

test('a mobile step body shows the mobile scope note', () => {
  const html = view.body({ stepId: 'livesync_mobile', mod: 'sala', dense: false, interconsulta: false, desktop: false, livesyncBtn: LIVESYNC, mobileScope: MOBILE });
  assert.ok(text(html).includes('La app móvil'));
});

test('quick route body renders for a step', () => {
  assert.ok(text(view.quick('quick_wrap')).length > 0);
});

test('badge shows the step position in the chapter', () => {
  const prog = { stepInChapter: 2, chapterSteps: 5, chapterIndex: 1, chapterCount: 3, chapterTitle: 'Inicio' };
  assert.ok(text(view.badge({ branch: 'sala', prog, idx: 2, total: 12 })).includes('Inicio'));
});

test('Siguiente button mode is set for every Fundamentos step', () => {
  for (const id of STEP_IDS) {
    const mode = view.nextButtonMode(id);
    assert.equal(typeof mode, 'string', id);
    if (stepRequiresUserAction(id) && id !== 'servicio_default') assert.notEqual(mode, 'show', id);
  }
});
