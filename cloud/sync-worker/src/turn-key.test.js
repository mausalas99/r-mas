import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTurnKey, TURN_KEY_TIMEZONE } from './turn-key.js';

describe('defaultTurnKey', () => {
  it('formats YYYY-MM-DD in Mexico City timezone', () => {
    // 2026-08-02 06:00 UTC = 2026-08-02 00:00 CDT (Mexico City)
    const key = defaultTurnKey(new Date('2026-08-02T06:00:00.000Z'));
    assert.equal(key, '2026-08-02');
  });

  it('rolls back a calendar day before UTC midnight in CDMX', () => {
    // 2026-08-02 05:59 UTC = 2026-08-01 23:59 CDT
    const key = defaultTurnKey(new Date('2026-08-02T05:59:59.000Z'));
    assert.equal(key, '2026-08-01');
  });

  it('uses America/Mexico_City timezone constant', () => {
    assert.equal(TURN_KEY_TIMEZONE, 'America/Mexico_City');
  });
});
