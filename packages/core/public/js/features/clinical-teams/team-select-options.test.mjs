import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamSelectOptions, fillTeamSelectOptions } from './team-select-options.mjs';

// Just enough DOM for fillTeamSelectOptions; serializes like the browser does for these nodes.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
class Option {
  constructor(text, value, _d, selected) { Object.assign(this, { text, value, selected: !!selected }); }
  get html() { return `<option value="${esc(this.value)}"${this.selected ? ' selected' : ''}>${esc(this.text)}</option>`; }
}
globalThis.Option = Option;
globalThis.document = { createElement: () => ({ label: '', kids: [], append(...k) { this.kids.push(...k); }, get html() { return `<optgroup label="${esc(this.label)}">${this.kids.map((k) => k.html).join('')}</optgroup>`; } }) };
const fill = (p) => { let out = ''; fillTeamSelectOptions({ replaceChildren: (...n) => { out = n.map((x) => x.html).join(''); } }, p); return out; };

const teams = [
  { team_id: 't3', name: 'Equipo <Z> & "C"', sala: 'Sala Q', sub_area_fraction: 'B' },
  { team_id: 't1', name: 'Equipo A', sala: 'Sala B', sub_area_fraction: 'A' },
  { team_id: 't2', service: 'Cardio', sala: '', sub_area_fraction: 'A' },
  { team_id: 't4', name: '', sala: 'Sala B', sub_area_fraction: 'C' },
];

test('options equal buildTeamSelectOptions (flat and by sala, picked and none)', () => {
  for (const groupBySala of [false, true]) {
    for (const selectedTeamId of ['', 't1', 't3', 'nope']) {
      assert.equal(fill({ teams, selectedTeamId, groupBySala }), buildTeamSelectOptions(teams, selectedTeamId, { groupBySala }));
    }
  }
});

test('placeholder first; empty list gives only the placeholder', () => {
  const ph = '<option value="">— Sin asignar —</option>';
  assert.equal(fill({ teams: [], placeholder: '— Sin asignar —' }), ph);
  assert.equal(fill({ teams, selectedTeamId: 't1', placeholder: '— Sin asignar —' }), ph + buildTeamSelectOptions(teams, 't1'));
});
