import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lastTeamActivity } from './panel-admin-html.mjs';

describe('lastTeamActivity', () => {
  const versions = {
    'entries/p1/fields': { updatedAt: '2026-10-05T00:00:00Z', actorId: 'u1' }, // archive: not activity
    'entries/p1/monitoreo': { updatedAt: '2026-10-01T00:00:00Z', actorId: 'u1' },
    'labSidecars/p1/s1': { updatedAt: '2026-10-03T00:00:00Z', actorId: 'outsider' },
    'entries/p1/note': { updatedAt: '2026-09-20T00:00:00Z', actorId: 'u2' },
    'entries/p2/note': { updatedAt: '2026-10-06T00:00:00Z', actorId: 'u1' },
  };

  it('counts only clinical work by team members', () => {
    const got = lastTeamActivity(versions, 'p1', new Set(['u1', 'u2']));
    assert.deepEqual(got, { updatedAt: '2026-10-01T00:00:00Z', actorId: 'u1', kind: 'Estado actual' });
  });

  it('no team → any actor counts', () => {
    assert.equal(lastTeamActivity(versions, 'p1', null)?.kind, 'Labs');
  });

  it('no team member activity → null', () => {
    assert.equal(lastTeamActivity(versions, 'p1', new Set(['u9'])), null);
  });
});
