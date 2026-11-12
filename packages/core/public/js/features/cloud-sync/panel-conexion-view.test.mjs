import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';

// Each case: `inputs` (what the panel read), `html` (the string builders' markup before the port) and `props`
// (what the models now hand the view). The view must draw `props` as `html`; the models must turn `inputs`
// into `props` (checked with a fixed clock, a fixed online flag and a fixed last push, see the replay below).
const CASES = createRequire(import.meta.url)('./panel-conexion-view.old.json');

const view = await loadJsx(import.meta.url, `import { ConexionShell, HeroBlock } from './panel-conexion-view.jsx';
  export const shell = (p) => renderToString(<ConexionShell {...p} />);
  export const hero = (p) => renderToString(<HeroBlock {...p} />);`);

// The old strings had layout whitespace, `/>` on void tags and shapes, and a space before `>`; same DOM.
const SHAPES = 'path|circle|rect|line|polyline';
const tidy = (s) => s
  .replace(new RegExp(`<(${SHAPES})([^>]*?)\\s*/>`, 'g'), '<$1$2></$1>')
  .replace(/>\s*\n\s*/g, '>').replace(/\s*\n\s*</g, '<').replace(/\s*\n\s*/g, ' ')
  .replace(/ {2,}/g, ' ').replace(/ ?\/>/g, '>').replace(/ >/g, '>');
const same = (a, b, name) => sameHtml(tidy(a), tidy(b), name);

for (const [key, c] of Object.entries(CASES)) {
  test(`Conexión shell equals the old HTML: ${key}`, () => {
    same(view.shell(c.props), c.html, key);
  });
}

test('the hero block alone (in-place refresh) is the block inside the shell', () => {
  const c = CASES.idle_admin;
  const block = view.hero(c.props.hero);
  assert.match(block, /^<div class="cloud-sync-hero-block" data-cloud-hero-block/);
  assert.ok(view.shell(c.props).includes(block));
});

test('signed out: form hooks the handlers use are all there, no sync button', () => {
  const html = view.shell(CASES.so_sala.props);
  for (const hook of ['data-cloud-login-user', 'data-cloud-login-pass', 'data-cloud-login-remember', 'data-cloud-reg-user', 'data-cloud-reg-display', 'data-cloud-reg-pass', 'data-cloud-reg-remember', 'data-cloud-recover-user', 'data-cloud-recover-code', 'data-cloud-recover-pass', 'data-cloud-recover-pass2', 'data-cloud-sync-url', 'data-cloud-tab-panel="login"', 'data-cloud-action="login"', 'data-cloud-action="register"', 'data-cloud-action="recover"']) {
    assert.ok(html.includes(hook), hook);
  }
  assert.doesNotMatch(html, /sync-now/);
});

test('signed in: sub-views, hosts and actions the panel mounts into are all there', () => {
  const html = view.shell(CASES.idle_admin.props);
  for (const hook of ['data-cloud-views', 'data-cloud-equipo-host', 'data-cloud-mobile-invite-host', 'data-cloud-interno-qr-host', 'data-cloud-admin-host', 'data-cloud-nube-diagnostics-host', 'data-cloud-tech-summary', 'data-cloud-action="sync-now"', 'data-cloud-action="leave-room"', 'data-cloud-action="copy-room-code"', 'data-cloud-action="save-url"', 'data-cloud-action="logout"']) {
    assert.ok(html.includes(hook), hook);
  }
  const noAdmin = view.shell(CASES.syncing_noadmin.props);
  assert.doesNotMatch(noAdmin, /data-cloud-admin-host|data-cloud-interno-qr-host/);
});

// ── Models: replay each case's inputs with the clock, network flag and last push the capture used. ──
test('models turn the inputs into the props (every status, signed out, no room)', async () => {
  const NOW = Date.parse('2026-11-12T18:00:00.000Z');
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.window = globalThis;
  globalThis.document = { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, createElement() { return {}; } };
  const RealDate = Date;
  const clockAt = (ms) => { globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(ms); } static now() { return NOW; } }; };
  const model = await loadJsx(import.meta.url, `export * from './panel-conexion-html.mjs';
    export { conexionHeroModel, connectedBodyModel } from './panel-conexion-views.mjs';
    export { signedOutBodyModel } from './panel-steps-html.mjs';
    export { noteCloudSyncPush, clearCloudSyncDiagnostics } from './cloud-sync-diagnostics.mjs';
    export { clinicalSessionContext } from '../../clinical-session-context.mjs';`);
  try {
    for (const [key, { inputs: c, props }] of Object.entries(CASES)) {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: c.online }, configurable: true });
      model.clinicalSessionContext.user = c.user || null;
      localStorage.setItem('rpc-cloud-sync-remember', c.remember ? '1' : '0');
      clockAt(NOW - 5 * 60000);
      if (c.push) model.noteCloudSyncPush();
      globalThis.Date = RealDate;
      const heroCtx = { status: c.status, detail: c.detail || '', transport: c.transport || 'poll', displaySala: c.displaySala, room: c.kind === 'in' ? c.room : null, tokenPresent: c.tokenPresent };
      const hero = c.kind === 'noroom' ? null : model.conexionHeroModel(heroCtx, NOW);
      const body = c.kind === 'out' ? model.signedOutBodyModel(c.url, c.displaySala)
        : model.connectedBodyModel({ cloudUser: c.cloudUser, room: c.kind === 'in' ? c.room : null, displaySala: c.displaySala, url: c.url, hasCloudSession: c.has, techSummary: c.kind === 'in' ? c.tech : '' });
      const got = { displaySala: c.displaySala, status: c.status, statusLabel: model.STATUS_LABELS[c.status] || c.status, chipClass: model.statusChipModifier(c.status), detail: c.detail || '', hero, body };
      assert.deepEqual(JSON.parse(JSON.stringify(got)), props, key);
      model.clearCloudSyncDiagnostics();
    }
  } finally {
    globalThis.Date = RealDate;
  }
});
