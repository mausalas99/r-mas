import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeCloudUsersForEquipos,
  filterTeamsBySala,
} from './panel-admin-equipos-data.mjs';
import { equiposListHtml, equiposShellHtml } from './panel-admin-equipos-html.mjs';

describe('mergeCloudUsersForEquipos', () => {
  it('merges cloud users with local clinical profiles by username', () => {
    const rows = mergeCloudUsersForEquipos(
      [
        { id: 'c1', username: 'r2garcia', display_name: 'García', disabled: false },
        { id: 'c2', username: 'disabled', display_name: 'X', disabled: true },
      ],
      [{ user_id: 'u1', username: 'r2garcia', clinical_name: 'Ana García', rank: 'R2', sala: 'Sala 1' }]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, 'u1');
    assert.equal(rows[0].rank, 'R2');
    assert.equal(rows[0].hasLocalProfile, true);
  });

  it('marks cloud-only users without local profile', () => {
    const rows = mergeCloudUsersForEquipos(
      [{ id: 'c3', username: 'newuser', display_name: 'Nuevo', disabled: false }],
      []
    );
    assert.equal(rows[0].hasLocalProfile, false);
    assert.equal(rows[0].clinical_name, 'Nuevo');
    assert.equal(rows[0].rank, 'R1');
  });

  it('includes clinical-only users that have no Nube account', () => {
    const rows = mergeCloudUsersForEquipos(
      [{ id: 'c1', username: 'drmauricios', display_name: 'Mauricio', disabled: false }],
      [
        {
          user_id: 'u-cloud',
          username: 'drmauricios',
          clinical_name: 'Dr. Mauricio',
          rank: 'R1',
          sala: 'Sala 2',
        },
        {
          user_id: 'u-test',
          username: 'teasteagtag',
          clinical_name: 'TEASTEATA',
          rank: 'R1',
          sala: 'Sala 2',
        },
      ]
    );
    assert.equal(rows.length, 2);
    const testRow = rows.find((r) => r.username === 'teasteagtag');
    assert.ok(testRow);
    assert.equal(testRow.clinicalOnly, true);
    assert.equal(testRow.hasLocalProfile, true);
    assert.equal(testRow.user_id, 'u-test');
  });
});

describe('filterTeamsBySala', () => {
  it('filters teams by sala when set', () => {
    const teams = [
      { team_id: 't1', sala: 'Sala 1' },
      { team_id: 't2', sala: 'Sala 2' },
    ];
    assert.equal(filterTeamsBySala(teams, 'Sala 1').length, 1);
    assert.equal(filterTeamsBySala(teams, '').length, 2);
  });
});

describe('equiposShellHtml', () => {
  it('includes search, sala filter and assign hint', () => {
    const html = equiposShellHtml();
    assert.match(html, /data-admin-equipos-search/);
    assert.match(html, /data-admin-equipos-sala/);
    assert.match(html, /clinicalOps/);
    assert.match(html, /refresh-equipos/);
  });
});

describe('equiposListHtml', () => {
  it('renders assign controls per user row', () => {
    const html = equiposListHtml(
      [
        {
          user_id: 'u1',
          username: 'r2test',
          clinical_name: 'Test',
          rank: 'R2',
          sala: 'Sala 1',
          hasLocalProfile: true,
        },
      ],
      [{ team_id: 't1', name: 'Equipo A', sala: 'Sala 1', service: 'Sala', members: [] }]
    );
    assert.match(html, /cloud-sync-admin-equipos-row/);
    assert.match(html, /assign-equipo/);
    assert.match(html, /save-equipo-rank/);
    assert.match(html, /purge-equipo-user/);
    assert.match(html, /cloud-sync-admin-equipos-rank/);
    assert.match(html, /@r2test/);
  });
});
