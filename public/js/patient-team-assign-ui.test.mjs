import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from './clinical-access-runtime.mjs';
import {
  activePatientTeamId,
  buildPatientTeamAssignSectionHtml,
  defaultPatientRegistrationTeamId,
} from './patient-team-assign-ui.mjs';

describe('patient-team-assign-ui', () => {
  beforeEach(() => {
    clinicalSessionContext.user = { user_id: 'u1', rank: 'R2' };
    clinicalSessionContext.teams = [
      { team_id: 't1', name: 'Equipo A', members: [{ user_id: 'u1' }] },
    ];
    clinicalSessionContext.scopeContext = {
      teams: clinicalSessionContext.teams,
      assignments: [{ patient_id: 'p1', team_id: 't1', effective_at: '2026-06-01T00:00:00Z' }],
      guardias: [],
      now: '2026-06-02T12:00:00Z',
    };
  });

  it('defaultPatientRegistrationTeamId picks sole joined team', () => {
    const user = { user_id: 'u1', sala: 'Sala 1' };
    assert.equal(defaultPatientRegistrationTeamId(user), 't1');
  });

  it('defaultPatientRegistrationTeamId prefers team in user sala', () => {
    clinicalSessionContext.teams = [
      { team_id: 't1', name: 'A', sala: 'Sala 2', members: [{ user_id: 'u1' }] },
      { team_id: 't2', name: 'B', sala: 'Sala 1', members: [{ user_id: 'u1' }] },
    ];
    const user = { user_id: 'u1', sala: 'Sala 1' };
    assert.equal(defaultPatientRegistrationTeamId(user), 't2');
  });

  it('shows team select with current team when patient is assigned', () => {
    const html = buildPatientTeamAssignSectionHtml({ id: 'p1' });
    assert.match(html, /patient-team-assign-select/);
    assert.match(html, /Equipo A/);
    assert.match(html, /Cambiar equipo/);
    assert.doesNotMatch(html, /field-readonly/);
  });

  it('shows assign select when patient has no team and user joined teams', () => {
    const html = buildPatientTeamAssignSectionHtml({ id: 'p2' });
    assert.match(html, /patient-team-assign-select/);
    assert.match(html, /Asignar a equipo/);
  });

  it('activePatientTeamId resolves latest active assignment', () => {
    assert.equal(activePatientTeamId('p1'), 't1');
    assert.equal(activePatientTeamId('p-missing'), '');
  });

  it('R2 team select only lists joined teams', () => {
    clinicalSessionContext.teams = [
      { team_id: 't1', name: 'Mio', sala: 'Sala 1', members: [{ user_id: 'u1' }] },
      { team_id: 't2', name: 'Ajeno', sala: 'Sala 2', members: [{ user_id: 'other' }] },
    ];
    clinicalSessionContext.scopeContext.teams = clinicalSessionContext.teams;
    const html = buildPatientTeamAssignSectionHtml({ id: 'p1' });
    assert.match(html, /Mio/);
    assert.doesNotMatch(html, /Ajeno/);
    assert.doesNotMatch(html, /optgroup/);
  });

  it('Admin team select lists all teams grouped by sala', () => {
    clinicalSessionContext.user = { user_id: 'admin1', rank: 'Admin' };
    clinicalSessionContext.teams = [
      { team_id: 't1', name: 'Dr. A', sala: 'Sala 1', members: [] },
      { team_id: 't2', name: 'Dr. B', sala: 'Sala 2', members: [] },
      { team_id: 't3', name: 'Dr. C', sala: 'Sala 1', members: [] },
    ];
    clinicalSessionContext.scopeContext.teams = clinicalSessionContext.teams;
    const html = buildPatientTeamAssignSectionHtml({ id: 'p1' });
    assert.match(html, /optgroup label="Sala 1"/);
    assert.match(html, /optgroup label="Sala 2"/);
    assert.match(html, /Dr\. A/);
    assert.match(html, /Dr\. B/);
    assert.match(html, /Dr\. C/);
  });
});
