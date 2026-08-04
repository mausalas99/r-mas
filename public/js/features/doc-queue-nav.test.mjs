import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eventualidadesPaneForDocQueueNav } from './doc-queue-nav.mjs';

describe('eventualidadesPaneForDocQueueNav', () => {
  it('selects labs when navigating to eventualidades', () => {
    assert.equal(eventualidadesPaneForDocQueueNav('eventualidades', 'labs'), 'labs');
    assert.equal(eventualidadesPaneForDocQueueNav('eventualidades', 'nota'), 'labs');
  });
  it('returns null for labs/pendientes/nota targets', () => {
    assert.equal(eventualidadesPaneForDocQueueNav('labs', 'labs'), null);
    assert.equal(eventualidadesPaneForDocQueueNav('pendientes'), null);
  });
});
