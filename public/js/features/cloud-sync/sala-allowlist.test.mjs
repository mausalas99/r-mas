import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCloudSala,
  displayCloudSalaLabel,
  isCloudSala,
  CLOUD_SALAS,
} from './sala-allowlist.mjs';

describe('sala-allowlist', () => {
  it('normalizes Sala aliases to individual wards', () => {
    assert.equal(normalizeCloudSala('Sala 1'), 'Sala 1');
    assert.equal(normalizeCloudSala('sala e'), 'Sala E');
    assert.equal(normalizeCloudSala('torre-hu'), 'Torre HU');
  });

  it('keeps clinical ward for Conexión display', () => {
    assert.equal(displayCloudSalaLabel('Sala 1'), 'Sala 1');
    assert.equal(displayCloudSalaLabel('sala 2'), 'Sala 2');
    assert.equal(displayCloudSalaLabel('sala e'), 'Sala E');
    assert.equal(displayCloudSalaLabel('Torre HU'), 'Torre HU');
    assert.equal(displayCloudSalaLabel('UX'), 'UX');
    assert.equal(displayCloudSalaLabel('', 'Sala 1'), 'Sala 1');
  });

  it('identifies all clinical wards as cloud salas', () => {
    assert.equal(isCloudSala('Sala 2'), true);
    assert.equal(isCloudSala('Torre HU'), true);
    assert.equal(isCloudSala('Interconsultas'), true);
    assert.equal(isCloudSala('UX'), true);
    assert.equal(isCloudSala('Eme'), true);
    assert.equal(isCloudSala('Área A/Pensionistas'), true);
    assert.equal(isCloudSala('Sala'), false);
  });

  it('exports frozen cloud sala list', () => {
    assert.ok(CLOUD_SALAS.includes('Sala 1'));
    assert.ok(CLOUD_SALAS.includes('Interconsultas'));
    assert.equal(CLOUD_SALAS.length, 8);
  });
});
