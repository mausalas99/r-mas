import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveZonesFromCensus,
  readInicioTurnoZonesPreference,
  writeInicioTurnoZonesPreference,
  zonesFooterNote,
  INICIO_TURNO_ZONES_LS,
} from './inicio-turno-zones.mjs';

const store = {};
const fakeStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

afterEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

describe('deriveZonesFromCensus', () => {
  it('groups by the real patient.area field with real bed counts', () => {
    const patients = [
      { id: 'a', area: 'N' },
      { id: 'b', area: 'N' },
      { id: 'c', area: 'V' },
      { id: 'd', area: '' },
      { id: 'e' },
    ];
    assert.deepEqual(deriveZonesFromCensus(patients), [
      { id: 'N', label: 'N', count: 2 },
      { id: 'V', label: 'V', count: 1 },
    ]);
  });

  it('returns an empty list when no patient has an area set', () => {
    assert.deepEqual(deriveZonesFromCensus([{ id: 'a' }]), []);
  });
});

describe('inicio turno zone persistence', () => {
  it('round-trips a selection across "app restarts" (fresh storage read)', () => {
    writeInicioTurnoZonesPreference(['N', 'V'], fakeStorage);
    assert.deepEqual(readInicioTurnoZonesPreference(fakeStorage), ['N', 'V']);
    assert.equal(fakeStorage.getItem(INICIO_TURNO_ZONES_LS), '["N","V"]');
  });

  it('returns an empty array when nothing was ever saved', () => {
    assert.deepEqual(readInicioTurnoZonesPreference(fakeStorage), []);
  });

  it('is defensive against corrupt storage content', () => {
    fakeStorage.setItem(INICIO_TURNO_ZONES_LS, '{not json');
    assert.deepEqual(readInicioTurnoZonesPreference(fakeStorage), []);
  });

  it('filters out non-string junk on write', () => {
    writeInicioTurnoZonesPreference(['N', 3, null, 'HD'], fakeStorage);
    assert.deepEqual(readInicioTurnoZonesPreference(fakeStorage), ['N', 'HD']);
  });
});

describe('zonesFooterNote', () => {
  it('prompts for a first choice when nothing was ever selected', () => {
    assert.match(zonesFooterNote([]), /Elige las zonas/);
  });

  it('names the previous selection', () => {
    assert.equal(
      zonesFooterNote(['N', 'V']),
      'La última vez llevaste N y V. Guardamos tu selección entre turnos.'
    );
  });
});
