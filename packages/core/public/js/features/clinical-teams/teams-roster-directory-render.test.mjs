import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderAssignTeamOptionsHtml } from './teams-roster-directory-render.mjs';

describe('renderAssignTeamOptionsHtml', () => {
  it('marks staged (rotation_active=0) teams so admins see they are not active yet', () => {
    const html = renderAssignTeamOptionsHtml([
      { team_id: 't1', name: 'Sala 2', sala: 'Sala 2', rotation_active: 1, members: [] },
      { team_id: 't2', name: 'Area A', sala: 'Area A', rotation_active: 0, members: [] },
    ]);
    assert.match(html, /Sala 2 · Sala 2 \(0\)/);
    assert.match(html, /Area A · Area A · Próxima rotación, aún no activo \(0\)/);
  });
});
