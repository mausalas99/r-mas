import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEntregaChipMarkers } from './entrega-chip-markers.mjs';

describe('resolveEntregaChipMarkers', () => {
  it('maps labels', () => {
    const markers = resolveEntregaChipMarkers(['negativas', 'show']);
    assert.deepEqual(
      markers.map((m) => m.label),
      ['NF', 'SH']
    );
  });
});
