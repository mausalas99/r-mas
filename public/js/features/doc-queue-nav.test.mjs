import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eventualidadesPaneForDocQueueNav } from './doc-queue-nav.mjs';

describe('eventualidadesPaneForDocQueueNav', () => {
  it('opens note pane for eventualidades (no Labs interpret)', () => {
    assert.equal(eventualidadesPaneForDocQueueNav('eventualidades', 'labs'), 'note');
    assert.equal(eventualidadesPaneForDocQueueNav('eventualidades', 'nota'), 'note');
  });
  it('returns null for labs/pendientes/nota targets', () => {
    assert.equal(eventualidadesPaneForDocQueueNav('labs', 'labs'), null);
    assert.equal(eventualidadesPaneForDocQueueNav('pendientes'), null);
  });
});
