import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findPatientEntryInBundleEntries,
  pickLanPatientRestoreEntry,
} from './host-patient-restore-pick.mjs';

describe('findPatientEntryInBundleEntries', () => {
  it('matches nested patient.id', () => {
    const entry = { patient: { id: 'p1', nombre: 'A' }, labHistory: [] };
    assert.equal(findPatientEntryInBundleEntries([entry], 'p1'), entry);
  });

  it('returns null when missing', () => {
    assert.equal(findPatientEntryInBundleEntries([{ patient: { id: 'x' } }], 'p1'), null);
  });
});

describe('pickLanPatientRestoreEntry', () => {
  it('prefers active room entry', () => {
    const active = { patient: { id: 'p1' } };
    const out = pickLanPatientRestoreEntry({
      activeEntry: active,
      otherEntries: [{ patient: { id: 'p1', from: 'other' } }],
      hostRow: { id: 'p1', from: 'census' },
    });
    assert.equal(out.via, 'active_room');
    assert.equal(out.entry, active);
  });

  it('falls back to other room then host census', () => {
    const other = { patient: { id: 'p1', via: 'other' } };
    assert.equal(
      pickLanPatientRestoreEntry({ activeEntry: null, otherEntries: [null, other] }).via,
      'other_room'
    );
    const census = pickLanPatientRestoreEntry({
      activeEntry: null,
      otherEntries: [null],
      hostRow: { id: 'p1', nombre: 'Ghost' },
    });
    assert.equal(census.via, 'host_census');
    assert.equal(census.entry.patient.nombre, 'Ghost');
  });

  it('returns patient_not_on_host when nothing matches', () => {
    const out = pickLanPatientRestoreEntry({});
    assert.equal(out.ok, false);
    assert.equal(out.error, 'patient_not_on_host');
  });
});
