import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB_EXTENDED_PANEL_DEFS } from './labs-panel-defs.mjs';
import {
  mergeLabPanelOverlayLww,
  applyOverlayToBuiltins,
  overlayRecordToPanelDef,
} from './labs-panel-overlay.mjs';

test('LWW keeps newer updatedAt per panelId', () => {
  var a = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['TSH'], fields: [], updatedAt: 1, updatedBy: 'x' }];
  var b = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['TSH', 'T4 LIBRE'], fields: [], updatedAt: 2, updatedBy: 'y' }];
  var m = mergeLabPanelOverlayLww(a, b);
  assert.equal(m.length, 1);
  assert.equal(m[0].gates.length, 2);
  assert.equal(m[0].updatedBy, 'y');
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
