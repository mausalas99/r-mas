import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_SALAS,
  LAN_ONLY_SALAS,
  isCloudSala,
  isLanOnlySala,
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

  it('normalizes Torre HU aliases', () => {
    assert.equal(normalizeCloudSala('Torre HU'), 'Torre HU');
    assert.equal(normalizeCloudSala('torre-hu'), 'Torre HU');
    assert.equal(normalizeCloudSala('torrehu'), 'Torre HU');
  });

  it('normalizes LAN-only salas', () => {
    assert.equal(normalizeCloudSala('interconsultas'), 'Interconsultas');
    assert.equal(normalizeCloudSala('UX'), 'UX');
    assert.equal(normalizeCloudSala('eme'), 'Eme');
    assert.equal(normalizeCloudSala('Área A/Pensionistas'), 'Área A/Pensionistas');
    assert.equal(normalizeCloudSala('area a'), 'Área A/Pensionistas');
  });
});

describe('isCloudSala', () => {
  it('allows cloud salas', () => {
    assert.equal(isCloudSala('Sala 1'), true);
    assert.equal(isCloudSala('Sala 2'), true);
    assert.equal(isCloudSala('Sala E'), true);
    assert.equal(isCloudSala('Torre HU'), true);
    assert.equal(isCloudSala('torre-hu'), true);
  });

  it('rejects LAN-only salas', () => {
    assert.equal(isCloudSala('Interconsultas'), false);
    assert.equal(isCloudSala('UX'), false);
    assert.equal(isCloudSala('Eme'), false);
    assert.equal(isCloudSala('Área A/Pensionistas'), false);
  });
});

describe('isLanOnlySala', () => {
  it('flags LAN-only salas', () => {
    for (const sala of LAN_ONLY_SALAS) {
      assert.equal(isLanOnlySala(sala), true);
    }
    for (const sala of CLOUD_SALAS) {
      assert.equal(isLanOnlySala(sala), false);
    }
  });
});
