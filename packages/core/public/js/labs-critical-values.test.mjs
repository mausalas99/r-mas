import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasCriticalLabValue } from './labs-critical-values.mjs';

describe('labs-critical-values', () => {
  it('sin sets: false', () => {
    assert.equal(hasCriticalLabValue([]), false);
  });

  it('K normal: false', () => {
    var sets = [{ fecha: '01/01/2026', parsedBySection: { ESC: { K: 4.0 } } }];
    assert.equal(hasCriticalLabValue(sets), false);
  });

  it('K crítico bajo: true', () => {
    var sets = [{ fecha: '01/01/2026', parsedBySection: { ESC: { K: 2.1 } } }];
    assert.equal(hasCriticalLabValue(sets), true);
  });

  it('usa solo el set más reciente', () => {
    var sets = [
      { fecha: '01/01/2026', parsedBySection: { ESC: { K: 2.1 } } },
      { fecha: '02/01/2026', parsedBySection: { ESC: { K: 4.0 } } },
    ];
    assert.equal(hasCriticalLabValue(sets), false);
  });

  it('HCO3 crítico alto: true', () => {
    var sets = [{ fecha: '01/01/2026', parsedBySection: { GASES: { Bica: 42 } } }];
    assert.equal(hasCriticalLabValue(sets), true);
  });
});
