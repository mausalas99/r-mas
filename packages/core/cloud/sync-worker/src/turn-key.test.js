import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTurnKey, TURN_KEY_TIMEZONE } from './turn-key.js';

describe('defaultTurnKey', () => {
  it('formats YYYY-MM in Mexico City timezone', () => {
    // 2026-08-02 06:00 UTC = 2026-08-02 00:00 CDT (Mexico City)
    const key = defaultTurnKey(new Date('2026-08-02T06:00:00.000Z'));
    assert.equal(key, '2026-08');
  });

  it('stays on prior month before CDMX midnight on the 1st', () => {
    // 2026-08-01 05:59 UTC = 2026-07-31 23:59 CDT
    const key = defaultTurnKey(new Date('2026-08-01T05:59:59.000Z'));
    assert.equal(key, '2026-07');
  });

  it('rolls to new month after CDMX midnight on the 1st', () => {
    // 2026-08-01 06:00 UTC = 2026-08-01 00:00 CDT
    const key = defaultTurnKey(new Date('2026-08-01T06:00:00.000Z'));
    assert.equal(key, '2026-08');
  });

  it('uses America/Mexico_City timezone constant', () => {
    assert.equal(TURN_KEY_TIMEZONE, 'America/Mexico_City');
  });
});
