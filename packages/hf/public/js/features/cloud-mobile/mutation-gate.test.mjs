import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterOpsForCloudMobile } from './mutation-gate.mjs';

describe('filterOpsForCloudMobile', () => {
  it('allows vitals monitoreo path', () => {
    const ops = [
      { path: 'entries/p1/monitoreo', value: { signos: [] } },
      { path: 'entries/p1/estadoActual', value: {} },
      { path: 'entries/p1/note', value: {} },
      { path: 'entries/p1/indicaciones', value: {} },
      { path: 'todos/todo-1', value: {} },
    ];
    assert.equal(filterOpsForCloudMobile(ops).length, 5);
  });

  it('rejects clinicalOps', () => {
    const ops = [
      { path: 'clinicalOps', value: { teams: [] } },
      { path: 'entries/p1/monitoreo', value: {} },
    ];
    const filtered = filterOpsForCloudMobile(ops);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].path, 'entries/p1/monitoreo');
  });

  it('rejects agenda, tombstones, and lab sidecars', () => {
    const ops = [
      { path: 'agenda/ev-1', value: {} },
      { path: 'tombstones/p1', value: {} },
      { path: 'entries/p1/labHistory/lab-1', value: {} },
      { path: 'entries/p1/fields', value: {} },
    ];
    assert.equal(filterOpsForCloudMobile(ops).length, 0);
  });
});
