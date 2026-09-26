import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderDirectorySectionHtml } from './teams-roster-directory.mjs';

describe('renderDirectorySectionHtml: team grid closed by the «¿No ves tu equipo?» card', () => {
  const prevWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = prevWindow;
  });

  it('puts the trailing card last, after the browsable teams, and passes it their count', async () => {
    globalThis.window = {
      rplusDb: {
        dbClinicalTeamsListBySala: async () => ({
          ok: true,
          teams: [{ team_id: 't2', name: 'Equipo B', sala: 'Sala 2', isMember: false, joinEligible: true }],
        }),
      },
    };

    let seen = -1;
    const { html, count } = await renderDirectorySectionHtml({
      userId: 'u1',
      elevated: false,
      browseSala: 'Sala 2',
      homeSala: 'Sala 2',
      trailingCard: (n) => {
        seen = n;
        return '<article class="clinical-teams-card clinical-teams-card--new">Nuevo</article>';
      },
    });

    assert.ok(html.indexOf('Equipo B') < html.indexOf('clinical-teams-card--new'));
    assert.equal(seen, 1);
    assert.equal(count, 1);
    assert.match(html, /Equipos en Sala 2/);
  });

  it('once you have a team, the list is «Otros equipos» and still ends in the new-team card', async () => {
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
      mineCount: 1,
      trailingCard: () => '<article class="clinical-teams-card clinical-teams-card--new">Nuevo</article>',
    });

    assert.match(html, /Otros equipos en Sala 2/);
    assert.match(html, /clinical-teams-empty/);
    assert.match(html, /clinical-teams-card--new/);
    assert.equal(count, 0);
  });
});
