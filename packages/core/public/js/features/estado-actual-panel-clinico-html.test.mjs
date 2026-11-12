import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshSoporteCalcHints } from './estado-actual-panel-clinico-html.mjs';

// Tiny DOM stand-in: elements record className, attributes, text and children.
function el(tag) {
  return {
    tag, className: '', attrs: {}, textContent: '', children: [],
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(c) { this.children.push(c); },
  };
}

test('refreshSoporteCalcHints reemplaza la lista al editar PEEP/meseta', () => {
  globalThis.document = { createElement: el };
  try {
    var appended = [];
    var insights = {
      querySelector: function () { return null; },
      appendChild: function (n) { appended.push(n); },
    };
    var mount = { querySelector: function () { return insights; } };
    refreshSoporteCalcHints(mount, { soporte: 'Ventilación mecánica', vmPeep: 10, vmPmeseta: 32 }, {});
    assert.equal(appended.length, 1);
    var ul = appended[0];
    assert.equal(ul.tag, 'ul');
    assert.equal(ul.className, 'ea-soporte-calc-list');
    assert.ok('data-ea-soporte-calc' in ul.attrs);
    assert.ok(ul.children.every((li) => li.tag === 'li' && li.className === 'ea-soporte-calc-item'));
    assert.ok(ul.children.some((li) => /Driving pressure 22/.test(li.textContent)));
    refreshSoporteCalcHints(mount, { soporte: 'Alto flujo', vmPeep: 10, vmPmeseta: 32 }, {});
    assert.equal(appended.length, 1);
  } finally {
    delete globalThis.document;
  }
});
