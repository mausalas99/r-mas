import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPickTeamsBannerHtml,
  shouldUsePickTeamPanelLayout,
  buildJoinedTeamsEmptyHtml,
  buildRotationAdminSectionHtml,
  buildClinicalTeamsHandleHint,
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

  it('buildJoinedTeamsEmptyHtml points upward in pick-team mode', () => {
    const html = buildJoinedTeamsEmptyHtml('drmendoza', true);
    assert.match(html, /arriba/i);
    assert.match(html, /Unirme/);
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

describe('buildClinicalTeamsHandleHint', () => {
  it('renders a quick sala select with the current sala chosen', () => {
    const html = buildClinicalTeamsHandleHint({
      displayHandle: 'drmauricios',
      sala: 'Sala 2',
      savedHandle: 'drmauricios',
      profileGatePending: false,
    });
    assert.match(html, /id="clinical-quick-sala"/);
    assert.match(html, /value="Sala 2" selected/);
  });

  it('returns empty string when there is no display handle', () => {
    assert.equal(buildClinicalTeamsHandleHint({ displayHandle: '', sala: '', savedHandle: '' }), '');
  });

  it('does not render the quick sala select while the profile gate is pending', () => {
    const html = buildClinicalTeamsHandleHint({
      displayHandle: 'drmauricios',
      sala: 'Sala 2',
      savedHandle: 'drmauricios',
      profileGatePending: true,
    });
    assert.doesNotMatch(html, /clinical-quick-sala/);
  });
});
