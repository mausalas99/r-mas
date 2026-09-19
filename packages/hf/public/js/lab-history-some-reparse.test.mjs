import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reparseLabSetFromSome, reparseLabSetsFromSome } from './lab-history-some-reparse.mjs';

const SOME =
  'Expediente: 1\nNombre: Ana\nFecha Registro: 13/08/2026 08:00\nHEMATOLOGÍA\n';

describe('reparseLabSetFromSome', () => {
  it('fills empty resLabs from a SOME report via the local parser', () => {
    const set = {
      id: '1',
      sourceText: SOME,
      resLabs: [],
    };
    const n = reparseLabSetFromSome(set, function () {
      return { resLabs: ['QS\tK 3.1*'], bhExtras: { leu: '7' } };
    });
    assert.equal(n, true);
    assert.deepEqual(set.resLabs, ['QS\tK 3.1*']);
    assert.equal(set.bhExtras.leu, '7');
  });

  it('does not reparse a SOME set that already has rows', () => {
    const set = { id: '1', sourceText: SOME, resLabs: ['QS\tK 3.1*'] };
    var calls = 0;
    assert.equal(
      reparseLabSetFromSome(set, function () {
        calls += 1;
        return { resLabs: ['QS\tK 0'] };
      }),
      false
    );
    assert.equal(calls, 0);
    assert.deepEqual(set.resLabs, ['QS\tK 3.1*']);
  });

  it('does not touch parsed-only sets without SOME sourceText', () => {
    const set = { id: '1', resLabs: ['QS\tK 4.0'] };
    assert.equal(reparseLabSetFromSome(set, function () {
      return { resLabs: ['QS\tK 0'] };
    }), false);
    assert.deepEqual(set.resLabs, ['QS\tK 4.0']);
  });
});

describe('reparseLabSetsFromSome', () => {
  it('parses only new SOME sets without rows', () => {
    const sets = [
      { id: 'a', sourceText: SOME, resLabs: [] },
      { id: 'prior', sourceText: SOME, resLabs: ['QS\tK 3.1*'] },
      { id: 'b', resLabs: ['QS\tNa 140'] },
    ];
    const n = reparseLabSetsFromSome(sets, function () {
      return { resLabs: ['QS\tK 2.9*'] };
    });
    assert.equal(n, 1);
    assert.deepEqual(sets[0].resLabs, ['QS\tK 2.9*']);
    assert.deepEqual(sets[1].resLabs, ['QS\tK 3.1*']);
    assert.deepEqual(sets[2].resLabs, ['QS\tNa 140']);
  });
});
