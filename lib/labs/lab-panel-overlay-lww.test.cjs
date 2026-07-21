'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mergeLabPanelOverlayLww } = require('./lab-panel-overlay-lww.cjs');

describe('lab-panel-overlay-lww', () => {
  it('keeps newer updatedAt per panelId', () => {
    const a = [
      {
        panelId: 'builtin:TIR',
        sectionKey: 'TIR',
        mode: 'num',
        gates: ['TSH'],
        fields: [],
        updatedAt: 1,
        updatedBy: 'x',
      },
    ];
    const b = [
      {
        panelId: 'builtin:TIR',
        sectionKey: 'TIR',
        mode: 'num',
        gates: ['TSH', 'T4 LIBRE'],
        fields: [],
        updatedAt: 2,
        updatedBy: 'y',
      },
    ];
    const m = mergeLabPanelOverlayLww(a, b);
    assert.equal(m.length, 1);
    assert.equal(m[0].gates.length, 2);
    assert.equal(m[0].updatedBy, 'y');
  });

  it('tie-break prefers lexicographically greater updatedBy', () => {
    const a = [
      {
        panelId: 'builtin:TIR',
        sectionKey: 'TIR',
        mode: 'num',
        gates: ['TSH'],
        fields: [],
        updatedAt: 5,
        updatedBy: 'alpha',
      },
    ];
    const b = [
      {
        panelId: 'builtin:TIR',
        sectionKey: 'TIR',
        mode: 'num',
        gates: ['T4 LIBRE'],
        fields: [],
        updatedAt: 5,
        updatedBy: 'beta',
      },
    ];
    const m = mergeLabPanelOverlayLww(a, b);
    assert.equal(m.length, 1);
    assert.equal(m[0].updatedBy, 'beta');
  });
});
