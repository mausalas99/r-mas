import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resumenGlanceCacheSuffix } from './pase-board-resumen-cache.mjs';

describe('resumenGlanceCacheSuffix', () => {
  it('changes when an open pendiente is added', () => {
    var empty = resumenGlanceCacheSuffix({}, []);
    var withTodo = resumenGlanceCacheSuffix({}, [
      { id: 't1', text: 'RX TORAX', completed: false, updatedAt: '2026-08-13T12:00:00.000Z' },
    ]);
    assert.notEqual(empty, withTodo);
    assert.match(withTodo, /\|P1/);
  });

  it('ignores completed pendientes', () => {
    var a = resumenGlanceCacheSuffix({}, []);
    var b = resumenGlanceCacheSuffix({}, [
      { id: 't1', text: 'done', completed: true, updatedAt: '2026-08-13T12:00:00.000Z' },
    ]);
    assert.equal(a, b);
  });

  it('changes when eventualidades appear', () => {
    var empty = resumenGlanceCacheSuffix({}, []);
    var withEv = resumenGlanceCacheSuffix(
      { eventualidades: { updatedAt: '2026-08-13T18:00:00.000Z', entries: [{ id: 'e1', text: 'AAAAA' }] } },
      []
    );
    assert.notEqual(empty, withEv);
    assert.match(withEv, /\|V1/);
  });
});
