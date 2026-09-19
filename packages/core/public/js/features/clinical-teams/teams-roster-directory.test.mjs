import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderDirectorySectionHtml } from './teams-roster-directory.mjs';

describe('renderDirectorySectionHtml leading cards (own joined team, merged grid)', () => {
  const prevWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = prevWindow;
  });

  it('puts leadingCardsHtml first in the grid, ahead of the browsable teams', async () => {
    globalThis.window = {
      rplusDb: {
        dbClinicalTeamsListBySala: async () => ({
          ok: true,
          teams: [{ team_id: 't2', name: 'Equipo B', sala: 'Sala 2', isMember: false, joinEligible: true }],
        }),
      },
    };

    const { html, count } = await renderDirectorySectionHtml({
      userId: 'u1',
      elevated: false,
      browseSala: 'Sala 2',
      homeSala: 'Sala 2',
      leadingCardsHtml: '<article class="clinical-teams-card clinical-teams-card--mine" data-team-id="t1">Mine</article>',
      leadingCount: 1,
    });

    const mineIdx = html.indexOf('clinical-teams-card--mine');
    const otherIdx = html.indexOf('Equipo B');
    assert.ok(mineIdx >= 0 && otherIdx >= 0 && mineIdx < otherIdx, 'own card renders before the directory cards');
    assert.equal(count, 1, 'count still reflects only the browsable (non-member) teams');
  });

  it('includes the leading count in the section title even when there are no other teams to browse', async () => {
    globalThis.window = {
      rplusDb: {
        dbClinicalTeamsListBySala: async () => ({ ok: true, teams: [] }),
      },
    };

    const { html, count } = await renderDirectorySectionHtml({
      userId: 'u1',
      elevated: false,
      browseSala: 'Sala 2',
      homeSala: 'Sala 2',
      leadingCardsHtml: '<article class="clinical-teams-card clinical-teams-card--mine" data-team-id="t1">Mine</article>',
      leadingCount: 1,
    });

    assert.match(html, /clinical-teams-card--mine/);
    assert.match(html, /1 equipo/);
    assert.equal(count, 0);
  });

  it('without leadingCardsHtml and no other teams, still shows the plain empty state', async () => {
    globalThis.window = {
      rplusDb: {
        dbClinicalTeamsListBySala: async () => ({ ok: true, teams: [] }),
      },
    };

    const { html } = await renderDirectorySectionHtml({
      userId: 'u1',
      elevated: false,
      browseSala: 'Sala 2',
      homeSala: 'Sala 2',
    });

    assert.match(html, /clinical-teams-empty/);
    assert.doesNotMatch(html, /clinical-teams-card--mine/);
  });
});
