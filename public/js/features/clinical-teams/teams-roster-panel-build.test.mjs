import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPickTeamsBannerHtml,
  shouldUsePickTeamPanelLayout,
  buildJoinedTeamsEmptyHtml,
} from './teams-roster-panel-build.mjs';

describe('teams-roster-panel-build pick-team UX', () => {
  it('shouldUsePickTeamPanelLayout when resident has directory teams and no membership', () => {
    assert.equal(shouldUsePickTeamPanelLayout(0, 3, false), true);
    assert.equal(shouldUsePickTeamPanelLayout(1, 3, false), false);
    assert.equal(shouldUsePickTeamPanelLayout(0, 0, false), false);
    assert.equal(shouldUsePickTeamPanelLayout(0, 3, true), false);
  });

  it('buildPickTeamsBannerHtml highlights existing teams for residents', () => {
    const html = buildPickTeamsBannerHtml({
      directoryCount: 4,
      sala: 'Sala 2',
      elevated: false,
      rejoinPending: true,
    });
    assert.match(html, /4 equipos/);
    assert.match(html, /Sala 2/);
    assert.match(html, /no hace falta crear uno nuevo/i);
  });

  it('buildJoinedTeamsEmptyHtml points upward in pick-team mode', () => {
    const html = buildJoinedTeamsEmptyHtml('drmendoza', true);
    assert.match(html, /arriba/i);
    assert.match(html, /Unirme/);
  });
});
