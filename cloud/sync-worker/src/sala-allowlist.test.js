import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_SALAS,
  isCloudSala,
  normalizeCloudSala,
} from './sala-allowlist.js';

describe('normalizeCloudSala', () => {
  it('normalizes Sala family to individual wards', () => {
    assert.equal(normalizeCloudSala('Sala 1'), 'Sala 1');
    assert.equal(normalizeCloudSala('sala 2'), 'Sala 2');
    assert.equal(normalizeCloudSala('Sala E'), 'Sala E');
    assert.equal(normalizeCloudSala('sala e'), 'Sala E');
  });

  it('does not treat bare Sala as a cloud ward', () => {
    assert.equal(normalizeCloudSala('sala'), 'sala');
    assert.equal(isCloudSala('Sala'), false);
  });

  it('normalizes all clinical ward aliases', () => {
    assert.equal(normalizeCloudSala('interconsultas'), 'Interconsultas');
    assert.equal(normalizeCloudSala('UX'), 'UX');
    assert.equal(normalizeCloudSala('eme'), 'Eme');
    assert.equal(normalizeCloudSala('Área A/Pensionistas'), 'Área A/Pensionistas');
    assert.equal(normalizeCloudSala('area a'), 'Área A/Pensionistas');
  });
});

describe('isCloudSala', () => {
  it('allows all clinical wards on Nube', () => {
    for (const sala of CLOUD_SALAS) {
      assert.equal(isCloudSala(sala), true, sala);
    }
    assert.equal(isCloudSala('torre-hu'), true);
  });

  it('rejects unknown sala labels', () => {
    assert.equal(isCloudSala('Sala'), false);
    assert.equal(isCloudSala(''), false);
  });
});
