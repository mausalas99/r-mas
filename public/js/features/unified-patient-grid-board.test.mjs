import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { calcVitalsBanner, UnifiedPatientGridBoard } from './unified-patient-grid-board.mjs';

describe('calcVitalsBanner', () => {
  it('returns Rutina for None frequency', () => {
    const r = calcVitalsBanner(new Date().toISOString(), 'None');
    assert.equal(r.str, 'Rutina');
    assert.equal(r.cls, 'nominal-gray');
  });

  it('returns RETRASADO when interval elapsed', () => {
    const past = new Date(Date.now() - 5 * 3600000).toISOString();
    const r = calcVitalsBanner(past, '4h');
    assert.equal(r.str, '⚠️ SIGNOS VENCIDOS');
    assert.equal(r.cls, 'breached');
  });

  it('returns warning when within 15 minutes of due', () => {
    const last = new Date(Date.now() - (3600000 - 10 * 60000)).toISOString();
    const r = calcVitalsBanner(last, '1h');
    assert.equal(r.cls, 'warning');
  });
});

describe('UnifiedPatientGridBoard', () => {
  /** @type {HTMLElement|null} */
  let host;

  beforeEach(() => {
    if (typeof document === 'undefined') return;
    host = document.createElement('div');
    host.id = 'test-guardia-grid';
    document.body.appendChild(host);
  });

  afterEach(() => {
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null;
  });

  it('sorts critical patients first', () => {
    if (typeof document === 'undefined') return;
    const board = new UnifiedPatientGridBoard('test-guardia-grid');
    const guardias = new Map([
      ['p1', { is_critical: 0 }],
      ['p2', { is_critical: 1 }],
    ]);
    board.drawCensusGrid(
      [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      guardias
    );
    const chips = host.querySelectorAll('.patient-chip-card');
    assert.equal(chips.length, 2);
    assert.equal(chips[0].getAttribute('data-patient-id'), 'p2');
  });

  it('renders R4 sector dividers', () => {
    if (typeof document === 'undefined') return;
    const board = new UnifiedPatientGridBoard('test-guardia-grid');
    board.drawCensusGrid(
      [
        { id: 'p1', name: 'A', service: 'Sala A' },
        { id: 'p2', name: 'B', service: 'Eme' },
      ],
      new Map(),
      'R4'
    );
    const dividers = host.querySelectorAll('.r4-section-divider');
    assert.equal(dividers.length, 2);
    assert.equal(dividers[0].textContent, 'Sala A');
    assert.equal(dividers[1].textContent, 'Eme');
  });

  it('shows DNR badge when negativa_maniobras_firmada is set', () => {
    if (typeof document === 'undefined') return;
    const board = new UnifiedPatientGridBoard('test-guardia-grid');
    board.drawCensusGrid([{ id: 'p1', name: 'X', negativa_maniobras_firmada: 1 }], new Map());
    assert.ok(host.querySelector('.dnr-badge'));
  });

  it('HANDOFF context invokes entrega callback instead of selectPatient', () => {
    let entregaCalled = false;
    const board = new UnifiedPatientGridBoard('test-guardia-grid', 'HANDOFF');
    board.onChipClick = (id) => {
      entregaCalled = id === 'p1';
    };
    const originalSelect = globalThis.selectPatient;
    globalThis.selectPatient = () => {
      throw new Error('selectPatient should not run in HANDOFF');
    };
    try {
      board.handleChipClick('p1');
      assert.equal(entregaCalled, true);
    } finally {
      if (originalSelect === undefined) delete globalThis.selectPatient;
      else globalThis.selectPatient = originalSelect;
    }
  });

  it('GUARDIA context calls selectPatient when available', () => {
    const board = new UnifiedPatientGridBoard('test-guardia-grid', 'GUARDIA');
    let selected = null;
    const originalSelect = globalThis.selectPatient;
    globalThis.selectPatient = (id) => {
      selected = id;
    };
    try {
      board.handleChipClick('p9');
      assert.equal(selected, 'p9');
    } finally {
      if (originalSelect === undefined) delete globalThis.selectPatient;
      else globalThis.selectPatient = originalSelect;
    }
  });
});
