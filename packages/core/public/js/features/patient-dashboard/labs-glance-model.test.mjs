import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLabsGlanceForDay } from './labs-glance-model.mjs';

describe('labs-glance-model', () => {
  it('compares with the previous lab day', () => {
    const sets = [
      { id: 'a', fecha: '27/09/2026', hora: '07:00', resLabs: ['BH\tHb 10.6* Leu 8.1 Plt 250'] },
      { id: 'b', fecha: '28/09/2026', hora: '07:00', resLabs: ['BH\tHb 9.8* Leu 7.9 Plt 240'] },
    ];
    const r = buildLabsGlanceForDay({ todayKey: '2026-9-28', orderedSets: sets });
    const hb = r.envios[0].groups[0].chips[0];
    assert.equal(hb.prev, '10.6');
    assert.equal(hb.trend, 'down');
    assert.equal(r.prevFecha, '27/09/2026');
  });
});
