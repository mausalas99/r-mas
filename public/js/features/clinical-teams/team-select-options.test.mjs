import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamSelectOptions } from './team-select-options.mjs';

describe('team-select-options', () => {
  const teams = [
    { team_id: 't2', name: 'Dr. B', sala: 'Sala 2' },
    { team_id: 't1', name: 'Dr. A', sala: 'Sala 1' },
    { team_id: 't3', name: 'Dr. C', sala: 'Sala 1' },
  ];

  it('flat list sorts by name without optgroups', () => {
    const html = buildTeamSelectOptions(teams, 't1');
    assert.doesNotMatch(html, /optgroup/);
    assert.match(html, /value="t1" selected/);
    assert.ok(html.indexOf('Dr. A') < html.indexOf('Dr. B'));
  });

  it('groupBySala emits optgroups in canonical sala order', () => {
    const html = buildTeamSelectOptions(teams, 't2', { groupBySala: true });
    assert.match(html, /optgroup label="Sala 1"/);
    assert.match(html, /optgroup label="Sala 2"/);
    assert.ok(html.indexOf('Sala 1') < html.indexOf('Sala 2'));
    assert.match(html, /value="t2" selected/);
  });
});
