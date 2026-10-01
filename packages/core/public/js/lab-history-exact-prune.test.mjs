import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyExactLabHistoryDedupe } from './lab-history-exact-prune.mjs';
import { getLabHistory } from './app-state.mjs';

describe('applyExactLabHistoryDedupe', () => {
  it('drops exact same-hour clones and keeps distinct hours', () => {
    var pid = 'prune-test-patient';
    getLabHistory()[pid] = [
      { id: '200', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG\tTTP 39.3*'] },
      { id: '100', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG\tTTP 39.3*'] },
      { id: '300', fecha: '13/08/2026', hora: '09:13', resLabs: ['FEB\tTifO neg'] },
    ];
    var removed = applyExactLabHistoryDedupe(pid);
    assert.deepEqual(removed, ['200']);
    assert.deepEqual(
      getLabHistory()[pid].map(function (s) {
        return s.id;
      }),
      ['100', '300'],
    );
    delete getLabHistory()[pid];
  });

  it('drops Nube clones that share analyte values on the same day', () => {
    var pid = 'prune-test-analyte';
    getLabHistory()[pid] = [
      { id: 'nube', fecha: '13/08/2026', hora: '11:41', resLabs: ['COAG\tTP 12.9 TTP 39.3* INR 1.1'] },
      { id: 'local', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG TP 12.9 TTP 39.3* INR 1.1'] },
    ];
    var removed = applyExactLabHistoryDedupe(pid);
    assert.deepEqual(removed, ['nube']);
    assert.equal(getLabHistory()[pid][0].id, 'local');
    delete getLabHistory()[pid];
  });

  it('is a no-op when there are no clones', () => {
    var pid = 'prune-test-clean';
    var sets = [
      { id: 'a', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG\tTTP 39.3*'] },
      { id: 'b', fecha: '13/08/2026', hora: '04:23', resLabs: ['BH\tHb 12.3*'] },
    ];
    getLabHistory()[pid] = sets;
    assert.deepEqual(applyExactLabHistoryDedupe(pid), []);
    assert.equal(getLabHistory()[pid], sets);
    delete getLabHistory()[pid];
  });

  it('drops a pulled set whose values sit inside a bigger set of the day', () => {
    var pid = 'prune-test-subsumed';
    var small = ['BH\tHb 11.9 Hto 35.7 VCM 88 HCM 29.5 Leu 3.81 Neu 2.59 Plt 182', 'QS\tGlu 85 Cr 0.6 BUN 30 AU 7.1'];
    var pb = { BH: { Hb: 11.9, Hto: 35.7, VCM: 88, HCM: 29.5, Leu: 3.81, Neu: 2.59, Plt: 182 }, QS: { Glu: 85, Cr: 0.6, BUN: 30, AU: 7.1 } };
    getLabHistory()[pid] = [
      { id: 's', fecha: '22/09/2026', hora: '14:41', resLabs: small, parsedBySection: pb },
      { id: 'b', fecha: '22/09/2026', hora: '', resLabs: small.concat(['INM\tC3 4']), parsedBySection: { ...pb, INM: { C3: 4 } } },
    ];
    assert.deepEqual(applyExactLabHistoryDedupe(pid), ['s']);
    assert.equal(getLabHistory()[pid][0].hora, '14:41');
    delete getLabHistory()[pid];
  });
});
