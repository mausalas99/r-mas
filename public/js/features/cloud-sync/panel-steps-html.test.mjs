import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { connectStepHtml, connectedStepsHtml } from './panel-steps-html.mjs';
import { applyConexionView, syncCloudSecondaryPanels } from './panel-conexion-views.mjs';

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
    });
    assert.match(html, /data-cloud-view="status"/);
    assert.match(html, /data-cloud-action="nav-options"/);
    assert.match(html, /data-cloud-view="options"/);
    assert.match(html, /data-cloud-view="admin"/);
    assert.match(html, /data-cloud-view="lan"/);
    assert.doesNotMatch(html, /cloud-sync-mas/);
    assert.doesNotMatch(html, /data-cloud-step="2"/);
    assert.doesNotMatch(html, /Operaciones del turno/);
  });

  it('options menu lists destinations', () => {
    const html = connectedStepsHtml({
      cloudUser: null,
      roomHtml: '',
      equipoHtml: '',
      url: '',
    });
    assert.match(html, /data-cloud-view="equipo"/);
    assert.match(html, /data-cloud-view="cuenta"/);
    assert.match(html, /data-cloud-view="advanced"/);
    assert.match(html, /Diagnóstico LAN/);
  });
});

function makeNode(attrs = {}) {
  const node = {
    className: '',
    dataset: {},
    hidden: !!attrs.hidden,
    children: [],
    parentElement: null,
    attributes: { ...attrs },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] ?? null; },
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
  if (sel === '[data-cloud-secondary]') return node.getAttribute('data-cloud-secondary') != null;
  const view = sel.match(/data-cloud-view="([^"]+)"/);
  if (view) return node.getAttribute('data-cloud-view') === view[1];
  return false;
}

describe('applyConexionView', () => {
  it('swaps views and syncs secondary stack', () => {
    const root = makeNode();
    const section = makeNode();
    section.className = 'cloud-sync-conexion';
    section.appendChild(makeNode({ 'data-cloud-view': 'status' }));
    section.appendChild(makeNode({ 'data-cloud-view': 'ops', hidden: true }));
    const stack = makeNode();
    stack.className = 'lan-connection-stack';
    const ops = makeNode({ 'data-cloud-secondary': 'ops' });
    const lan = makeNode({ 'data-cloud-secondary': 'lan' });
    stack.appendChild(ops);
    stack.appendChild(lan);
    root.appendChild(section);
    root.appendChild(stack);

    applyConexionView(/** @type {any} */ (section), 'status');
    assert.equal(stack.hidden, true);
    assert.equal(ops.hidden, true);

    applyConexionView(/** @type {any} */ (section), 'ops');
    assert.equal(stack.hidden, false);
    assert.equal(ops.hidden, false);
    assert.equal(lan.hidden, true);
    assert.equal(section.querySelector('[data-cloud-view="status"]').hidden, true);

    syncCloudSecondaryPanels(/** @type {any} */ (root), 'lan');
    assert.equal(ops.hidden, true);
    assert.equal(lan.hidden, false);
  });
});
