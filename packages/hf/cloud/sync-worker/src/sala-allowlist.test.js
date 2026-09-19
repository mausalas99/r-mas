import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_SALAS,
  isCloudSala,
  normalizeCloudSala,
} from './sala-allowlist.js';

describe('normalizeCloudSala', () => {
  it('normalizes Unidad IC aliases', () => {
    assert.equal(normalizeCloudSala('Unidad IC'), 'Unidad IC');
    assert.equal(normalizeCloudSala('unidad ic'), 'Unidad IC');
    assert.equal(normalizeCloudSala('IC'), 'Unidad IC');
  });

  it('leaves unknown labels alone', () => {
    assert.equal(normalizeCloudSala('Sala 1'), 'Sala 1');
    assert.equal(isCloudSala('Sala 1'), false);
  });
});

describe('isCloudSala', () => {
  it('allows the single R+ HF sala', () => {
    for (const sala of CLOUD_SALAS) {
      assert.equal(isCloudSala(sala), true, sala);
    }
    assert.equal(isCloudSala('ic'), true);
  });

  it('rejects legacy IM ward labels', () => {
    assert.equal(isCloudSala('Sala 1'), false);
    assert.equal(isCloudSala('Torre HU'), false);
    assert.equal(isCloudSala(''), false);
  });
});
