'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { createHostStore } = require('./host-store.js');
const { createConflictResolver, ConflictError } = require('./conflict-resolver.js');

test('auto-merge disjoint keys on version mismatch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-merge-'));
  const filePath = path.join(dir, 's.json');
  const store = createHostStore({ filePath, teamCodePlain: 'tok' });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', version: 1 }, null);
  const resolver = createConflictResolver({ store });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '201', expectedVersion: 1 }, 1);
  const out = resolver.applyMutation({
    entityType: 'patient',
    entityId: 'p1',
    expectedVersion: 1,
    baseData: { id: 'p1', nombre: 'Ana', cuarto: '101' },
    changedKeys: ['cama'],
    data: { id: 'p1', nombre: 'Ana', cuarto: '101', cama: 'B' },
  });
  assert.strictEqual(out.autoMerged, true);
  assert.strictEqual(out.data.cuarto, '201');
  assert.strictEqual(out.data.cama, 'B');
});

test('structural conflict when keys overlap', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-conf-'));
  const filePath = path.join(dir, 's.json');
  const store = createHostStore({ filePath, teamCodePlain: 'tok' });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '101' }, null);
  const resolver = createConflictResolver({ store });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '201' }, 1);
  assert.throws(
    () =>
      resolver.applyMutation({
        entityType: 'patient',
        entityId: 'p1',
        expectedVersion: 1,
        baseData: { id: 'p1', nombre: 'Ana', cuarto: '101' },
        changedKeys: ['cuarto'],
        data: { id: 'p1', nombre: 'Ana', cuarto: '102' },
      }),
    (e) => e instanceof ConflictError && e.conflictingKeys.includes('cuarto')
  );
});
