import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeClinicalChangeOps } from './op-encoder.mjs';

describe('encodeClinicalChangeOps dispatch', () => {
  it('returns empty for unknown types (projector skip)', () => {
    assert.deepEqual(
      encodeClinicalChangeOps({
        commandType: 'unknown.cmd',
        patientId: 'p1',
        patients: [],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
  });
});
