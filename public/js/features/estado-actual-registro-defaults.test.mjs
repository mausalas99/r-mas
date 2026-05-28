import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultRegistroRecordedAt,
  getGlucometriaRegistroWindow,
  collectGlucometriasForRegistroWindow,
} from './estado-actual-registro-defaults.mjs';

describe('estado-actual-registro-defaults', () => {
  it('getDefaultRegistroRecordedAt is today at 00:00 local', () => {
    var now = new Date(2026, 4, 27, 14, 30, 0);
    var d = getDefaultRegistroRecordedAt(now);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 4);
    assert.equal(d.getDate(), 27);
    assert.equal(d.getHours(), 0);
    assert.equal(d.getMinutes(), 0);
  });

  it('collectGlucometriasForRegistroWindow keeps glus from yesterday 08:00 until today 00:00', () => {
    var now = new Date(2026, 4, 27, 9, 0, 0);
    var historial = [
      {
        recordedAt: new Date(2026, 4, 26, 7, 0, 0).toISOString(),
        glucometrias: [{ value: 99, time: '07:00' }],
      },
      {
        recordedAt: new Date(2026, 4, 26, 10, 0, 0).toISOString(),
        glucometrias: [{ value: 120, time: '10:00' }],
      },
      {
        recordedAt: new Date(2026, 4, 27, 0, 0, 0).toISOString(),
        glucometrias: [{ value: 180, time: '00:00' }],
      },
      {
        recordedAt: new Date(2026, 4, 27, 8, 0, 0).toISOString(),
        glucometrias: [{ value: 200, time: '08:00' }],
      },
    ];
    var glus = collectGlucometriasForRegistroWindow(historial, now);
    assert.deepEqual(
      glus.map(function (g) {
        return g.value + '@' + g.time;
      }),
      ['180@00:00', '120@10:00']
    );
    var win = getGlucometriaRegistroWindow(now);
    assert.equal(win.start.getHours(), 8);
    assert.equal(win.end.getHours(), 0);
    assert.equal(win.end.getDate(), 27);
  });

  it('collectGlucometriasForRegistroWindow drops glus after today 00:00 even in midnight row', () => {
    var now = new Date(2026, 4, 28, 8, 39, 0);
    var historial = [
      {
        recordedAt: new Date(2026, 4, 27, 17, 20, 0).toISOString(),
        glucometrias: [
          { value: 190, time: '08:00' },
          { value: 280, time: '10:00' },
          { value: 221, time: '16:00' },
          { value: 136, time: '20:00' },
        ],
      },
      {
        recordedAt: new Date(2026, 4, 28, 0, 0, 0).toISOString(),
        glucometrias: [
          { value: 159, time: '00:00' },
          { value: 135, time: '08:00' },
          { value: 191, time: '12:00' },
          { value: 194, time: '16:00' },
        ],
      },
    ];
    var glus = collectGlucometriasForRegistroWindow(historial, now);
    assert.deepEqual(
      glus.map(function (g) {
        return g.value + '@' + g.time;
      }),
      ['159@00:00', '190@08:00', '280@10:00', '221@16:00', '136@20:00']
    );
  });
});
