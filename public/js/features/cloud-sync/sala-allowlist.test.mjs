import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCloudSala,
  displayCloudSalaLabel,
  isCloudSala,
  CLOUD_SALAS,
} from './sala-allowlist.mjs';

describe('sala-allowlist', () => {
  it('normalizes Unidad IC aliases', () => {
    assert.equal(normalizeCloudSala('Unidad IC'), 'Unidad IC');
    assert.equal(normalizeCloudSala('unidad ic'), 'Unidad IC');
    assert.equal(normalizeCloudSala('ic'), 'Unidad IC');
  });

  it('keeps clinical sala for Conexión display', () => {
    assert.equal(displayCloudSalaLabel('Unidad IC'), 'Unidad IC');
    assert.equal(displayCloudSalaLabel('unidad ic'), 'Unidad IC');
    assert.equal(displayCloudSalaLabel('', 'Unidad IC'), 'Unidad IC');
  });

  it('identifies the single R+ HF sala as a cloud sala', () => {
    assert.equal(isCloudSala('Unidad IC'), true);
    assert.equal(isCloudSala('Sala 1'), false);
  });

  it('exports frozen cloud sala list', () => {
    assert.ok(CLOUD_SALAS.includes('Unidad IC'));
    assert.equal(CLOUD_SALAS.length, 1);
  });
});
