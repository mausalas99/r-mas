import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rt } from './lab-panel-runtime-state.mjs';
import { applyBulkLabPatientSwitch } from './lab-panel-workbench-finalize.mjs';
import {
  onLabHistoryRevision,
  bumpLabHistoryRevision,
  resetLabHistoryCacheForTests,
} from '../lab-history-cache.mjs';

// Mirrors the fix in finalizeBulkLabPaste (lab-panel-workbench.mjs): the
// revision must be re-bumped for the patient the switch actually landed on,
// not the id that was active when the bulk-paste store write happened —
// otherwise the dashboard's onLabHistoryRevision listener silently drops the
// event (its id check no longer matches) and Resumen never repaints.
describe('bulk lab paste patient switch + revision bump ordering', () => {
  beforeEach(() => {
    resetLabHistoryCacheForTests();
  });

  it('re-bumping revision after the switch reaches a listener gated on the new active id', () => {
    var activeId = 'old-patient';
    rt.getActiveId = () => activeId;
    rt.selectPatient = (id) => {
      activeId = id;
    };
    rt.findPatientByRegistro = () => ({ id: 'new-patient', nombre: 'Test' });
    rt.showToast = () => {};

    var seen = [];
    onLabHistoryRevision((id) => seen.push(id));

    applyBulkLabPatientSwitch(
      { expediente: '123' },
      {},
      [{ okReportCount: 2 }],
      () => {}
    );
    // Bug: bumping for the pre-switch id is what the dashboard listener drops.
    bumpLabHistoryRevision('old-patient');
    // Fix: bump again for the id the switch actually landed on.
    bumpLabHistoryRevision(rt.getActiveId());

    assert.equal(rt.getActiveId(), 'new-patient');
    assert.deepEqual(seen, ['old-patient', 'new-patient']);
  });
});
