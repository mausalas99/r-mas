import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  renderTeamEditPanelHtml,
  renderMembersBlock,
  renderMyCycleEditBlock,
  renderJoinedTeamCard,
} from './teams-roster-team-cards.mjs';

describe('renderTeamEditPanelHtml rotation override', () => {
  it('an active team defaults the rotation select to "Esta rotación"', () => {
    const html = renderTeamEditPanelHtml({ team_id: 't1', name: 'A', sala: 'Sala 1', rotation_active: 1 });
    assert.match(html, /clinical-teams-edit-rotation-active/);
    assert.match(html, /<option value="1" selected>Esta rotación/);
    assert.match(html, /<option value="0" >Próxima rotación/);
  });

  it('a staged team defaults the rotation select to "Próxima rotación"', () => {
    const html = renderTeamEditPanelHtml({ team_id: 't2', name: 'B', sala: 'Sala 1', rotation_active: 0 });
    assert.match(html, /<option value="1" >Esta rotación/);
    assert.match(html, /<option value="0" selected>Próxima rotación/);
  });
});

describe('joined-team card stays short by default', () => {
  it('renderMembersBlock shows the roster open, with a count', () => {
    const html = renderMembersBlock([{ user_id: 'u1', username: 'drmendoza', rank: 'R2' }], {
      teamId: 't1',
      compact: true,
    });
    assert.doesNotMatch(html, /<details/);
    assert.match(html, /Integrantes \(1\)/);
  });

  it('renderMyCycleEditBlock collapses the cycle form instead of opening it', () => {
    const team = { team_id: 't1', service: 'Sala', members: [{ user_id: 'u1', username: 'drmendoza', rank: 'R2' }] };
    const html = renderMyCycleEditBlock(team, { user_id: 'u1', username: 'drmendoza' });
    assert.match(html, /<details class="clinical-teams-collapse[^"]*"[^>]*data-collapse-key="card\.t1\.cycle2"(?![^>]*open)/);
  });

  it('renderJoinedTeamCard leads with «Estás en» + Invitar, members open, Salir last', () => {
    const prevUser = clinicalSessionContext.user;
    clinicalSessionContext.user = { user_id: 'u1', username: 'drmendoza', rank: 'R2' };
    try {
      const team = {
        team_id: 't1',
        name: 'Equipo A',
        sala: 'Sala 1',
        service: 'Sala',
        rotation_active: 1,
        members: [{ user_id: 'u1', username: 'drmendoza', rank: 'R2', sub_area_fraction: 'A1' }],
      };
      const html = renderJoinedTeamCard(team, [team]);
      assert.match(html, /Estás en[\s\S]*Equipo A[\s\S]*>Invitar</);
      assert.doesNotMatch(html, /Detalles del equipo/);
      assert.ok(html.indexOf('Integrantes (1)') < html.indexOf('Salir del equipo'));
    } finally {
      clinicalSessionContext.user = prevUser;
    }
  });
});
