import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB_EXTENDED_PANEL_DEFS } from './labs-panel-defs.mjs';
import {
  mergeLabPanelOverlayLww,
  applyOverlayToBuiltins,
  overlayRecordToPanelDef,
  panelDefToOverlayPatch,
} from './labs-panel-overlay.mjs';

test('LWW keeps newer updatedAt per panelId', () => {
  var a = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['TSH'], fields: [], updatedAt: 1, updatedBy: 'x' }];
  var b = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['TSH', 'T4 LIBRE'], fields: [], updatedAt: 2, updatedBy: 'y' }];
  var m = mergeLabPanelOverlayLww(a, b);
  assert.equal(m.length, 1);
  assert.equal(m[0].gates.length, 2);
  assert.equal(m[0].updatedBy, 'y');
});

test('LWW tie-break prefers lexicographically greater updatedBy', () => {
  var a = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['TSH'], fields: [], updatedAt: 5, updatedBy: 'alpha' }];
  var b = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['T4 LIBRE'], fields: [], updatedAt: 5, updatedBy: 'beta' }];
  var m = mergeLabPanelOverlayLww(a, b);
  assert.equal(m.length, 1);
  assert.equal(m[0].updatedBy, 'beta');
  assert.deepEqual(m[0].gates, ['T4 LIBRE']);
});

test('applyOverlayToBuiltins patches TIR labels', () => {
  var overlay = [{
    panelId: 'builtin:TIR',
    baseSectionKey: 'TIR',
    sectionKey: 'TIR',
    mode: 'num',
    gates: ['TSH'],
    fields: [{ key: 'TSH', labels: ['TSH', 'HORMONA ESTIMULANTE DE LA TIROIDES', 'TSH ULTRA'] }],
    updatedAt: 1,
    updatedBy: 'x',
  }];
  var eff = applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, overlay);
  var tir = eff.find((d) => d.sectionKey === 'TIR' && d.mode === 'num');
  assert.ok(tir.fields.some((f) => f.key === 'TSH' && f.labels.includes('TSH ULTRA')));
});

test('user panel appends new sectionKey', () => {
  var overlay = [{
    panelId: 'user:abc',
    sectionKey: 'CUST',
    mode: 'num',
    gates: ['FOO MARKER'],
    fields: [{ key: 'Foo', labels: ['FOO MARKER'] }],
    updatedAt: 1,
    updatedBy: 'x',
  }];
  var eff = applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, overlay);
  assert.ok(eff.some((d) => d.sectionKey === 'CUST'));
});

test('gate round-trip preserves literal TSH matching', () => {
  var rec = {
    panelId: 'user:rt',
    sectionKey: 'TIR',
    mode: 'num',
    gates: ['TSH'],
    fields: [{ key: 'TSH', labels: ['TSH'] }],
    updatedAt: 1,
    updatedBy: 't',
  };
  var def1 = overlayRecordToPanelDef(rec);
  assert.ok(def1.gates[0].test('TSH'));
  assert.ok(def1.gates[0].test('tsh'));
  var patch = panelDefToOverlayPatch(def1, {
    panelId: 'user:rt',
    updatedAt: 2,
    updatedBy: 't',
    gates: rec.gates,
  });
  assert.deepEqual(patch.gates, ['TSH']);
  var def2 = overlayRecordToPanelDef(patch);
  assert.ok(def2.gates[0].test('TSH'));
  assert.ok(def2.gates[0].test('tsh'));
});

test('hydrateGate preserves builtin word-boundary regex source', () => {
  var def = overlayRecordToPanelDef({
    panelId: 'user:wb',
    sectionKey: 'X',
    mode: 'num',
    gates: ['\\bTSH\\b'],
    fields: [],
    updatedAt: 1,
    updatedBy: 't',
  });
  assert.ok(def.gates[0].test('TSH'));
  assert.ok(!def.gates[0].test('ATSH'));
});
