import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkCloudOps, MAX_LAB_OPS_PER_CHUNK } from './cloud-push-direct.mjs';

function labOp(i) {
  return {
    path: `labSidecars/p1/set-${i}`,
    value: { id: `set-${i}`, resLabs: [`BH\tHb ${i}`] },
    updatedAt: 't',
    actorId: 'a',
  };
}

describe('chunkCloudOps', () => {
  it('splits lab sidecars into batches of at most MAX_LAB_OPS_PER_CHUNK', () => {
    const ops = Array.from({ length: 21 }, (_, i) => labOp(i));
    const chunks = chunkCloudOps(ops);
    assert.equal(chunks.length, Math.ceil(21 / MAX_LAB_OPS_PER_CHUNK));
    chunks.forEach((chunk) => {
      const labCount = chunk.filter((op) => String(op.path).startsWith('labSidecars/')).length;
      assert.ok(labCount <= MAX_LAB_OPS_PER_CHUNK);
    });
    assert.equal(chunks.flat().length, 21);
  });

  it('keeps non-lab ops in the same chunk until byte budget', () => {
    const ops = [
      { path: 'entries/p1/fields', value: { nombre: 'A' }, updatedAt: 't', actorId: 'a' },
      labOp(1),
      labOp(2),
    ];
    const chunks = chunkCloudOps(ops);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].length, 3);
  });
});
