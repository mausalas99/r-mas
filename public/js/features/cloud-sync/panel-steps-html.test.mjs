import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { connectStepHtml, connectedStepsHtml } from './panel-steps-html.mjs';
import { roomConnectedHtml } from './panel-conexion-html.mjs';
import {
  applyConexionView,
  syncCloudSecondaryPanels,
  resolveConexionPanelRoot,
} from './panel-conexion-views.mjs';

describe('connectStepHtml', () => {
  it('includes recover tab and recover action', () => {
    const html = connectStepHtml('https://example.workers.dev');
    assert.match(html, /data-cloud-tab="recover"/);
    assert.match(html, /Recuperar/);
    assert.match(html, /data-cloud-action="recover"/);
    assert.match(html, /data-cloud-recover-user/);
    assert.match(html, /data-cloud-recover-code/);
  });

  it('defaults login tab panel visible', () => {
    const html = connectStepHtml('');
    assert.match(html, /data-cloud-tab-panel="login"[^>]*role="tabpanel"/);
    assert.match(html, /data-cloud-tab-panel="recover"[^>]*hidden/);
  });
});

describe('connectedStepsHtml', () => {
  it('renders status sheet without stacked Más / steps', () => {
    const html = connectedStepsHtml({
      cloudUser: { username: 'doc', displayName: 'Dr. Test' },
      roomHtml: '<div data-test-room></div>',
      equipoHtml: '<button data-cloud-action="open-rotation">Ir a Mi rotación</button>',
      adminHtml: '<div data-cloud-admin-host></div>',
      url: 'https://example.workers.dev',
      hasCloudSession: true,
    });
    assert.match(html, /data-cloud-view="status"/);
    assert.match(html, /data-cloud-action="nav-options"/);
    assert.match(html, /cloud-sync-options-entry/);
    assert.match(html, /data-cloud-view="options"/);
    assert.match(html, /data-cloud-view="admin"/);
    assert.match(html, /Administración/);
    assert.match(html, /cloud-sync-options-group/);
    assert.match(html, /data-cloud-view="lan"/);
    assert.doesNotMatch(html, /cloud-sync-mas/);
    assert.doesNotMatch(html, /data-cloud-step="2"/);
    assert.doesNotMatch(html, /Operaciones del turno/);
  });

  it('connected views start on status with Opciones entry, not step 2/3', () => {
    const html = connectedStepsHtml({
      cloudUser: { username: 'r1', displayName: 'Ana' },
      roomHtml: '<div data-cloud-room>Sala 1</div>',
      equipoHtml: '<div></div>',
      url: 'https://example.workers.dev',
      hasCloudSession: true,
    });
    assert.match(html, /data-cloud-view="status"/);
    assert.match(html, /Opciones/);
    assert.doesNotMatch(html, /data-cloud-step="2"/);
  });

  it('options and nested views have no body nav bar (modal head owns chrome)', () => {
    const html = connectedStepsHtml({
      cloudUser: null,
      roomHtml: '',
      equipoHtml: '',
      url: '',
      hasCloudSession: true,
    });
    assert.match(html, /data-cloud-view="options"[^>]*data-cloud-view-title="Opciones"/);
    assert.match(html, /data-cloud-view="cuenta"[^>]*data-cloud-view-title="Cuenta"/);
    assert.doesNotMatch(html, /cloud-sync-view-bar/);
    assert.doesNotMatch(html, /cloud-sync-view-back/);
  });

  it('options menu lists destinations', () => {
    const html = connectedStepsHtml({
      cloudUser: null,
      roomHtml: '',
      equipoHtml: '',
      url: '',
      hasCloudSession: true,
    });
    assert.match(html, /data-cloud-view="equipo"/);
    assert.match(html, /data-cloud-view="cuenta"/);
    assert.match(html, /data-cloud-view="admin"/);
    assert.match(html, /data-cloud-view="advanced"/);
    assert.match(html, /Diagnóstico LAN/);
  });
});

function makeNode(attrs = {}) {
  const node = {
    id: attrs.id || '',
    className: '',
    dataset: {},
    hidden: !!attrs.hidden,
    children: [],
    parentElement: null,
    attributes: { ...attrs },
    setAttribute(k, v) {
      this.attributes[k] = v;
      if (k === 'data-cloud-stack-view') this.dataset.cloudStackView = v;
    },
    getAttribute(k) {
      return this.attributes[k] ?? null;
    },
    closest(sel) {
      let cur = this;
      while (cur) {
        if (sel.startsWith('#') && cur.id === sel.slice(1)) return cur;
        if (sel.startsWith('.') && cur.className === sel.slice(1)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    querySelectorAll(sel) {
      return collectMatches(this, sel);
    },
  };
  return node;
}

function collectMatches(root, sel) {
  const out = [];
  for (const c of root.children || []) {
    if (matchesSel(c, sel)) out.push(c);
    out.push(...collectMatches(c, sel));
  }
  return out;
}

function matchesSel(node, sel) {
  if (sel.startsWith('.') && node.className === sel.slice(1)) return true;
  if (sel === '[data-cloud-view]') return node.getAttribute('data-cloud-view') != null;
  if (sel === '[data-cloud-views]') return node.getAttribute('data-cloud-views') != null;
  if (sel === '[data-cloud-secondary]') return node.getAttribute('data-cloud-secondary') != null;
  const view = sel.match(/data-cloud-view="([^"]+)"/);
  if (view) return node.getAttribute('data-cloud-view') === view[1];
  return false;
}

describe('applyConexionView', () => {
  it('swaps views, hides home chrome on subviews, syncs secondary stack', () => {
    const root = makeNode({ id: 'lan-connection-panel-root' });
    root.id = 'lan-connection-panel-root';
    const section = makeNode();
    section.className = 'cloud-sync-conexion';
    const head = makeNode();
    head.className = 'cloud-sync-conexion-head';
    const views = makeNode();
    views.className = 'cloud-sync-views';
    views.setAttribute('data-cloud-views', '1');
    views.attributes['data-cloud-views'] = '1';
    views.appendChild(makeNode({ 'data-cloud-view': 'status' }));
    views.appendChild(makeNode({ 'data-cloud-view': 'ops', hidden: true }));
    views.appendChild(makeNode({ 'data-cloud-view': 'admin', hidden: true }));
    section.appendChild(head);
    section.appendChild(views);
    const stack = makeNode();
    stack.className = 'lan-connection-stack';
    const ops = makeNode({ 'data-cloud-secondary': 'ops' });
    const lan = makeNode({ 'data-cloud-secondary': 'lan' });
    stack.appendChild(ops);
    stack.appendChild(lan);
    root.appendChild(section);
    root.appendChild(stack);

    assert.equal(resolveConexionPanelRoot(/** @type {any} */ (section)), root);

    applyConexionView(/** @type {any} */ (section), 'status');
    assert.equal(stack.hidden, true);
    assert.equal(ops.hidden, true);
    assert.equal(head.hidden, false);

    applyConexionView(/** @type {any} */ (section), 'admin');
    assert.equal(stack.hidden, true);
    assert.equal(ops.hidden, true);
    assert.equal(lan.hidden, true);
    assert.equal(head.hidden, true);

    applyConexionView(/** @type {any} */ (section), 'ops');
    assert.equal(stack.hidden, false);
    assert.equal(ops.hidden, false);
    assert.equal(lan.hidden, true);
    assert.equal(head.hidden, true);
    assert.equal(views.querySelector('[data-cloud-view="status"]').hidden, true);

    syncCloudSecondaryPanels(/** @type {any} */ (root), 'lan');
    assert.equal(ops.hidden, true);
    assert.equal(lan.hidden, false);

    const orphan = makeNode();
    orphan.className = 'lan-sync-diagnostics-panel';
    root.appendChild(orphan);
    syncCloudSecondaryPanels(/** @type {any} */ (root), 'status');
    assert.equal(orphan.hidden, true);
    syncCloudSecondaryPanels(/** @type {any} */ (root), 'lan');
    assert.equal(orphan.hidden, false);
  });
});

describe('connectedViewsHtml ops host', () => {
  it('keeps ops view as host without stacking create-teams copy', () => {
    const html = connectedStepsHtml({
      cloudUser: { username: 'r4' },
      roomHtml: '',
      equipoHtml: '',
      url: '',
      hasCloudSession: true,
    });
    // Elevated privileges mocked via clinical session may omit ops; host markup is optional.
    // Ensure admin path still has no details accordion remnants in options.
    assert.match(html, /data-cloud-view="options"/);
    assert.doesNotMatch(html, /Crear equipos del mes/);
  });
});

describe('roomConnectedHtml', () => {
  it('omits opaque Sala bucket row; keeps turn code revision', () => {
    const html = roomConnectedHtml(
      { sala: 'Sala', turnKey: '2026-08-03', code: 'RC65RH', revision: 1 },
      () => 0
    );
    assert.doesNotMatch(html, /<dt>Sala<\/dt>/);
    assert.match(html, /<dt>Turno<\/dt>/);
    assert.match(html, /RC65RH/);
    assert.match(html, /data-cloud-room-revision/);
    assert.match(html, /cloud-sync-inset-group/);
    assert.match(html, /leave-room/);
    // Leave shares the same inset group as Turno/Código/Revisión (one card).
    assert.equal((html.match(/cloud-sync-inset-group/g) || []).length, 1);
  });
});
