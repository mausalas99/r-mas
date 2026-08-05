import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCloudSala,
  displayCloudSalaLabel,
  isCloudSala,
  isLanOnlySala,
  CLOUD_SALAS,
  LAN_ONLY_SALAS,
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
    assert.equal(displayCloudSalaLabel('', 'Sala 1'), 'Sala 1');
  });

  it('identifies cloud salas', () => {
    assert.equal(isCloudSala('Sala 2'), true);
    assert.equal(isCloudSala('Torre HU'), true);
    assert.equal(isCloudSala('Sala'), false);
    assert.equal(isCloudSala('UX'), false);
  });

  it('identifies LAN-only salas', () => {
    assert.equal(isLanOnlySala('Interconsultas'), true);
    assert.equal(isLanOnlySala('Área A/Pensionistas'), true);
    assert.equal(isLanOnlySala('Sala 1'), false);
  });

  it('exports frozen lists', () => {
    assert.deepEqual(CLOUD_SALAS, ['Sala 1', 'Sala 2', 'Sala E', 'Torre HU']);
    assert.ok(LAN_ONLY_SALAS.includes('Eme'));
  });
});
