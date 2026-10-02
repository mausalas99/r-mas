import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVitalFieldsHtml,
  collapseAllVitalStacks,
  expandVitalNextLayer,
  readVitalSeriesFromStack,
  setVitalStackFromSeries,
  syncVitalAddButtonVisibility,
} from './estado-actual-panel-vitals.mjs';

function node(attrs, cls, children) {
  var n = { attrs: attrs, cls: cls || [], children: [], parent: null, hidden: false, value: '' };
  (children || []).forEach(function (c) { adopt(n, c); });
  n.getAttribute = function (k) { return k in n.attrs ? n.attrs[k] : null; };
  n.setAttribute = function (k, v) { n.attrs[k] = String(v); };
  n.querySelector = function (sel) { return find(n, sel); };
  n.appendChild = function (c) { adopt(n, c); };
  n.querySelectorAll = function () { return []; };
  Object.defineProperty(n, 'parentElement', { get: function () { return n.parent; } });
  return n;
}
function adopt(parent, c) {
  if (c.parent) c.parent.children = c.parent.children.filter(function (x) { return x !== c; });
  c.parent = parent;
  parent.children.push(c);
}
function matches(n, sel) {
  var parts = sel.match(/\[[^\]]+\]|\.[\w-]+/g) || [];
  return parts.every(function (p) {
    if (p[0] === '.') return n.cls.indexOf(p.slice(1)) >= 0;
    var m = p.match(/^\[([\w-]+)(?:="(.*)")?\]$/);
    if (!(m[1] in n.attrs)) return false;
    return m[2] === undefined || n.attrs[m[1]] === m[2];
  });
}
function find(root, sel) {
  var i0 = sel.indexOf('] ');
  if (i0 > 0) {
    var head = find(root, sel.slice(0, i0 + 1));
    return head ? find(head, sel.slice(i0 + 2)) : null;
  }
  for (var i = 0; i < root.children.length; i++) {
    var c = root.children[i];
    if (matches(c, sel)) return c;
    var d = find(c, sel);
    if (d) return d;
  }
  return null;
}

// Fake form with the same attributes buildVitalStackHtml writes: TAS/TAD pair + FC.
function fakeForm() {
  function stack(key, addKey) {
    var kids = [0, 1, 2, 3].map(function (li) {
      var input = node({ 'data-ea-vital': key, 'data-ea-layer-idx': String(li) });
      var time = node({ 'data-ea-altered': key + '__L' + li });
      var chip = node({}, ['ea-vital-chip'], [input, time]);
      var slot = node({ 'data-ea-layer': String(li) }, [], [chip]);
      slot.hidden = li > 0;
      return slot;
    });
    if (addKey) {
      var btn = node({ 'data-ea-vital-add': addKey });
      btn.hidden = true;
      kids.push(btn);
    }
    return node({ 'data-ea-vital-stack': key, 'data-ea-layer-count': '1' }, [], kids);
  }
  return node({}, [], [stack('tas', null), stack('tad', 'ta'), stack('fc', 'fc')]);
}
var tas = function (f, i) { return f.querySelector('[data-ea-vital="tas"][data-ea-layer-idx="' + i + '"]'); };
var tad = function (f, i) { return f.querySelector('[data-ea-vital="tad"][data-ea-layer-idx="' + i + '"]'); };
var slot = function (f, key, i) { return f.querySelector('[data-ea-vital-stack="' + key + '"] [data-ea-layer="' + i + '"]'); };

test('buildVitalFieldsHtml: one TA pair with a single +1, keys unchanged', () => {
  var html = buildVitalFieldsHtml();
  assert.equal((html.match(/class="ea-ta-pair"/g) || []).length, 1);
  assert.equal((html.match(/data-ea-vital-add="ta"/g) || []).length, 1);
  assert.equal(html.includes('data-ea-vital-add="tas"'), false);
  assert.equal(html.includes('data-ea-vital-add="tad"'), false);
  ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'].forEach(function (k) {
    assert.ok(html.includes('data-ea-vital-stack="' + k + '"'), k);
  });
});

test('one +1 opens the same row for TAS and TAD; max 4 pairs', () => {
  var f = fakeForm();
  collapseAllVitalStacks(f);
  tas(f, 0).value = '118';
  syncVitalAddButtonVisibility(f, 'tas');
  assert.equal(f.querySelector('[data-ea-vital-add="ta"]').hidden, false);
  expandVitalNextLayer(f, 'ta');
  assert.equal(slot(f, 'tas', 1).hidden, false);
  assert.equal(slot(f, 'tad', 1).hidden, false);
  tad(f, 1).value = '70';
  expandVitalNextLayer(f, 'ta');
  tas(f, 2).value = '121';
  expandVitalNextLayer(f, 'ta');
  assert.equal(slot(f, 'tas', 3).hidden, false);
  assert.equal(f.querySelector('[data-ea-vital-stack="tad"]').getAttribute('data-ea-layer-count'), '4');
  assert.equal(f.querySelector('[data-ea-vital-add="ta"]').hidden, true);
});

test('unpaired readings: every stored TAS and TAD value stays visible and is read back', () => {
  var f = fakeForm();
  setVitalStackFromSeries(f, 'tas', [{ value: 120 }, { value: 125 }, { value: 130, time: '03:00' }]);
  setVitalStackFromSeries(f, 'tad', [{ value: 80 }]);
  [0, 1, 2].forEach(function (i) {
    assert.equal(slot(f, 'tas', i).hidden, false);
    assert.equal(slot(f, 'tad', i).hidden, false);
  });
  assert.equal(slot(f, 'tad', 3).hidden, true);
  assert.deepEqual(readVitalSeriesFromStack(f, 'tas').map(function (r) { return r.value; }), [120, 125, 130]);
  assert.deepEqual(readVitalSeriesFromStack(f, 'tad').map(function (r) { return r.value; }), [80]);
  assert.equal(readVitalSeriesFromStack(f, 'tas')[2].time, '03:00');
});

test('stale pair rows collapse when the next fill is shorter', () => {
  var f = fakeForm();
  setVitalStackFromSeries(f, 'tas', [{ value: 1 }, { value: 2 }, { value: 3 }]);
  setVitalStackFromSeries(f, 'tad', [{ value: 1 }, { value: 2 }, { value: 3 }]);
  setVitalStackFromSeries(f, 'tas', [{ value: 110 }]);
  setVitalStackFromSeries(f, 'tad', [{ value: 70 }]);
  assert.equal(slot(f, 'tas', 1).hidden, true);
  assert.equal(slot(f, 'tad', 1).hidden, true);
});
