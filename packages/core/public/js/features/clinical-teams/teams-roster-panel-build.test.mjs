import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPickTeamsBannerHtml,
  shouldUsePickTeamPanelLayout,
  buildRotationAdminSectionHtml,
} from './teams-roster-panel-build.mjs';

describe('teams-roster-panel-build pick-team UX', () => {
  it('shouldUsePickTeamPanelLayout when resident has directory teams and no membership', () => {
    assert.equal(shouldUsePickTeamPanelLayout(0, 3, false), true);
    assert.equal(shouldUsePickTeamPanelLayout(1, 3, false), false);
    assert.equal(shouldUsePickTeamPanelLayout(0, 0, false), false);
    assert.equal(shouldUsePickTeamPanelLayout(0, 3, true), false);
  });

  it('shouldUsePickTeamPanelLayout is false when user already joined a team', () => {
    assert.equal(shouldUsePickTeamPanelLayout(2, 5, false), false);
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

  it('buildPickTeamsBannerHtml stays out of the plain pick-team case', () => {
    assert.equal(buildPickTeamsBannerHtml({ directoryCount: 1, sala: 'Sala 2', elevated: false, rejoinPending: false }), '');
  });

  it('buildRotationAdminSectionHtml is empty for a non-elevated user', () => {
    assert.equal(buildRotationAdminSectionHtml({ rank: 'R2' }), '');
  });

  it('buildRotationAdminSectionHtml is collapsed by default for R4', () => {
    const html = buildRotationAdminSectionHtml({ rank: 'R4' });
    assert.match(html, /class="clinical-teams-collapse/);
    assert.doesNotMatch(html, /<details[^>]* open/);
    assert.match(html, /Iniciar nueva rotación/);
    assert.match(html, /Calendario de vigencia/);
  });
});
