'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHostStore } = require('./host-store.js');
const { createDeltaResolver } = require('./delta-resolver.js');

function makeStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-delta-'));
  const store = createHostStore({
    filePath: path.join(dir, 'state.json'),
    teamCodePlain: '123456',
  });
  return { dir, store };
}

test('applyDelta creates fieldMeta and appends delta log entry', () => {
  const { store } = makeStore();
  const resolver = createDeltaResolver({ store, nowIso: () => '2026-06-05T20:45:10.000Z' });
  const out = resolver.applyDelta({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
    clientId: 'lc_a',
    txId: 'tx_1',
    pathValues: { 'labsAtAdmission.na': 140 },
    pathMeta: { 'labsAtAdmission.na': { clientTimestamp: 1718293049283 } },
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.deltaSeq, 1);
  assert.deepEqual(out.acceptedPaths, ['labsAtAdmission.na']);
  assert.deepEqual(out.rejectedPaths, []);

  const row = store.getEntity({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
  });
  assert.equal(row.data.labsAtAdmission.na, 140);
  assert.equal(row.fieldMeta['labsAtAdmission.na'].deltaSeq, 1);

  const replay = store.getRoomDeltaLog('room-a', 0);
  assert.equal(replay.ok, true);
  assert.equal(replay.deltas.length, 1);
  assert.equal(replay.deltas[0].txId, 'tx_1');
});
