import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePendientesJson, serializePendientesJson } from './entrega-pendientes.mjs';

describe('normalizePendientesJson', () => {
  it('legacy string array', () => {
    const doc = normalizePendientesJson(JSON.stringify(['TAC 14:00', 'Hb']));
    assert.equal(doc.version, 2);
    assert.equal(doc.items.length, 2);
    assert.equal(doc.items[0].type, 'legacy_text');
  });

  it('v2 round-trip', () => {
    const raw = serializePendientesJson({
      version: 2,
      items: [
        {
          id: 'p1',
          type: 'procedimiento',
          kind: 'otro',
          label: 'Endoscopia',
          scheduledAt: '2026-06-02T14:00:00',
          lockedBase: true,
          createdBy: { userId: 'u1', rank: 'Team' },
        },
      ],
    });
    const doc = normalizePendientesJson(raw);
    assert.equal(doc.items[0].type, 'procedimiento');
    assert.equal(doc.items[0].label, 'Endoscopia');
  });
});
