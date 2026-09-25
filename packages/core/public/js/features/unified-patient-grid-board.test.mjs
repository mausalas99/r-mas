import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcVitalsBanner, filterR4FollowUpPinPatients } from './unified-patient-grid-board.mjs';

describe('calcVitalsBanner', () => {
  it('returns Sin signos for None frequency', () => {
    const r = calcVitalsBanner(new Date().toISOString(), 'None');
    assert.match(r.str, /Sin signos/);
    assert.equal(r.cls, 'nominal-gray');
  });

  it('returns RETRASADO when interval elapsed', () => {
    const past = new Date(Date.now() - 5 * 3600000).toISOString();
    const r = calcVitalsBanner(past, '4h');
    assert.equal(r.str, 'Signos vencidos');
    assert.equal(r.cls, 'breached');
  });

  it('returns warning when within 15 minutes of due', () => {
    const last = new Date(Date.now() - (3600000 - 10 * 60000)).toISOString();
    const r = calcVitalsBanner(last, '1h');
    assert.equal(r.cls, 'warning');
  });
});

describe('filterR4FollowUpPinPatients', () => {
  it('keeps active Follow-up rows only', () => {
    const rows = filterR4FollowUpPinPatients([
      { id: 'a', interconsult_type: 'Follow-up', interconsult_status: 'Active' },
      { id: 'b', interconsult_type: 'Follow-up', interconsult_status: 'Resolved' },
      { id: 'c', interconsult_type: 'None', interconsult_status: 'Pending' },
      { id: 'd', interconsult_type: 'Follow-up', interconsult_status: 'Pending' },
    ]);
    assert.deepEqual(
      rows.map((r) => r.id),
      ['a', 'd']
    );
  });
});
