import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  preferKeeperSetIdFromConsolidateResult,
  runLabConsolidateUiRefresh,
} from './lab-panel-history-consolidate-refresh.mjs';

describe('lab-panel-history-consolidate-refresh', () => {
  it('preferKeeperSetIdFromConsolidateResult picks first keeper', () => {
    assert.equal(preferKeeperSetIdFromConsolidateResult(null), '');
    assert.equal(preferKeeperSetIdFromConsolidateResult({ keeperIds: [] }), '');
    assert.equal(
      preferKeeperSetIdFromConsolidateResult({ keeperIds: ['keep-a', 'keep-b'] }),
      'keep-a'
    );
  });

  it('clears activeLab before render so merged set shows without page refresh', () => {
    var calls = [];
    runLabConsolidateUiRefresh(
      {
        persistClinicalState: function () {
          calls.push('save');
        },
        setLabHistorySelectedSetId: function (pid, sid) {
          calls.push('prefer:' + pid + ':' + sid);
        },
        setActiveLab: function (v) {
          calls.push('clear:' + String(v));
        },
        renderLabHistoryPanel: function () {
          calls.push('render');
        },
        refreshTendenciasOrCultivosPanel: function () {
          calls.push('tend');
        },
        showToast: function () {},
      },
      'pid-1',
      2,
      { preferSetId: 'keeper-9' }
    );
    assert.deepEqual(calls, [
      'save',
      'prefer:pid-1:keeper-9',
      'clear:null',
      'render',
      'tend',
    ]);
  });
});
