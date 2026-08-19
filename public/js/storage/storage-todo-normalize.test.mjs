import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTodoRow } from './storage-todo-normalize.mjs';

describe('normalizeTodoRow inProgress flag', () => {
  it('defaults inProgress to false when absent', () => {
    const row = normalizeTodoRow({ id: 't1', text: 'Reponer potasio' }, '2026-08-18T00:00:00Z');
    assert.equal(row.inProgress, false);
  });

  it('keeps inProgress true when the source todo carries it', () => {
    const row = normalizeTodoRow(
      { id: 't1', text: 'Reponer potasio', inProgress: true },
      '2026-08-18T00:00:00Z'
    );
    assert.equal(row.inProgress, true);
  });

  it('coerces truthy non-boolean values to a real boolean', () => {
    const row = normalizeTodoRow({ id: 't1', text: 'x', inProgress: 1 }, '2026-08-18T00:00:00Z');
    assert.equal(row.inProgress, true);
  });
});
