import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateDek, encryptValue } from '../js/features/cloud-sync/crypto.mjs';
import { deriveInternoSubkey } from '../js/features/cloud-sync/crypto.mjs';
import { serializePendientesJson } from '../../lib/entrega/entrega-pendientes.mjs';
import {
  assembleInternoBoard,
  buildEncryptedInternoVitals,
  decryptAndAssembleInternoBoard,
  decryptInternoRelayBoard,
  subkeyB64FromLocationHash,
} from './interno-crypto-board.mjs';

function sampleClinicalOps() {
  const pendientesJson = serializePendientesJson({
    version: 2,
    items: [],
    vitalsPlan: { enabled: true, frequency: 'q4h', metrics: ['ta', 'fc'] },
  });
  return {
    teams: [{ team_id: 't1', sala: 'Sala 1', members: [{ user_id: 'r1-on', rank: 'R1' }] }],
    team_membership: [{ team_id: 't1', user_id: 'r1-on', rank: 'R1' }],
    team_guardia_today: [{ team_id: 't1', user_id: 'r1-on' }],
    active_guardias: [
      {
        patient_id: 'p1',
        covering_user_id: 'r1-on',
        source_team_id: 't1',
        status: 'Active',
        pendientes_json: pendientesJson,
        vitals_frequency: 'q4h',
      },
    ],
  };
}

describe('subkeyB64FromLocationHash', () => {
  it('reads k= from a bare fragment', () => {
    assert.equal(subkeyB64FromLocationHash('#k=abc123'), 'abc123');
  });

  it('returns empty for a fragment without k=', () => {
    assert.equal(subkeyB64FromLocationHash('#other=1'), '');
    assert.equal(subkeyB64FromLocationHash(''), '');
  });
});

describe('decryptInternoRelayBoard', () => {
  it('decrypts clinicalOps and every entry monitoreo envelope', async () => {
    const dek = await generateDek();
    const subkey = await deriveInternoSubkey(dek);
    const clinicalOps = sampleClinicalOps();
    const monitoreo = { historial: [{ recordedAt: '2026-09-12T10:00:00.000Z', vitals: { fc: 80 } }] };
    const relayBoard = {
      active: true,
      sala: 'Sala 1',
      clinicalOps: await encryptValue(subkey, clinicalOps),
      entries: [
        { id: 'p1', nombre: 'GONZALEZ TEST', monitoreo: await encryptValue(subkey, monitoreo) },
      ],
    };
    const out = await decryptInternoRelayBoard(subkey, relayBoard);
    assert.deepEqual(out.clinicalOps, clinicalOps);
    assert.deepEqual(out.entries[0].monitoreo, monitoreo);
    assert.equal(out.entries[0].nombre, 'GONZALEZ TEST');
  });

  it('passes plaintext fields through unchanged (legacy pre-E2EE room)', async () => {
    const dek = await generateDek();
    const subkey = await deriveInternoSubkey(dek);
    const relayBoard = {
      active: true,
      sala: 'Sala 1',
      clinicalOps: null,
      entries: [{ id: 'p1', nombre: 'GONZALEZ TEST', monitoreo: { historial: [] } }],
    };
    const out = await decryptInternoRelayBoard(subkey, relayBoard);
    assert.equal(out.clinicalOps, null);
    assert.deepEqual(out.entries[0].monitoreo, { historial: [] });
  });
});

describe('assembleInternoBoard / decryptAndAssembleInternoBoard', () => {
  it('builds the same board DTO shape the Worker used to build server-side', () => {
    const board = assembleInternoBoard(
      'Sala 1',
      [{ id: 'p1', nombre: 'GONZALEZ TEST', sala: 'Sala 1' }],
      sampleClinicalOps()
    );
    assert.equal(board.active, true);
    assert.equal(board.patients.length, 1);
    assert.equal(board.patients[0].id, 'p1');
  });

  it('end to end: decrypts a relay board and assembles it, keeping decrypted entries for later vitals submits', async () => {
    const dek = await generateDek();
    const subkey = await deriveInternoSubkey(dek);
    const clinicalOps = sampleClinicalOps();
    const relayBoard = {
      active: true,
      sala: 'Sala 1',
      clinicalOps: await encryptValue(subkey, clinicalOps),
      entries: [{ id: 'p1', nombre: 'GONZALEZ TEST', sala: 'Sala 1' }],
    };
    const board = await decryptAndAssembleInternoBoard(subkey, relayBoard);
    assert.equal(board.active, true);
    assert.equal(board.patients[0].id, 'p1');
    assert.equal(board.entries[0].id, 'p1');
  });

  it('passes an inactive/no-room relay board through untouched', async () => {
    const dek = await generateDek();
    const subkey = await deriveInternoSubkey(dek);
    const inactive = { active: false, inactive: true, sala: 'Sala 1', entries: [], clinicalOps: null };
    assert.deepEqual(await decryptAndAssembleInternoBoard(subkey, inactive), inactive);
  });
});

describe('buildEncryptedInternoVitals', () => {
  it('appends a medicion and returns a re-encrypted monitoreo envelope, no plaintext leaves this function', async () => {
    const dek = await generateDek();
    const subkey = await deriveInternoSubkey(dek);
    const currentEnvelope = await encryptValue(subkey, { historial: [], estadoClinico: {}, confirmado: {} });

    const out = await buildEncryptedInternoVitals(subkey, currentEnvelope, {
      vitals: { fc: 88 },
      sala: 'Sala 1',
    });
    assert.equal(out.ok, true);
    assert.ok(out.medicionId);
    assert.equal(out.monitoreoEnvelope.enc, 1);
    assert.ok(!('vitals' in out.monitoreoEnvelope));

    const { decryptValue } = await import('../js/features/cloud-sync/crypto.mjs');
    const decrypted = await decryptValue(subkey, out.monitoreoEnvelope);
    assert.equal(decrypted.historial.length, 1);
    assert.equal(decrypted.historial[0].vitals.fc, 88);
  });

  it('rejects an empty medicion before touching crypto', async () => {
    const dek = await generateDek();
    const subkey = await deriveInternoSubkey(dek);
    const out = await buildEncryptedInternoVitals(subkey, null, { vitals: {}, glucometrias: [] });
    assert.equal(out.ok, false);
  });
});
