import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import { assignTeamOptions, cycleOptions } from './panel-admin-equipos-html-fields.mjs';
import * as S from './panel-admin-equipos-options-scenarios.mjs';
import OLD from './panel-admin-equipos-options.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { TeamOptions } from './panel-admin-equipos-view.jsx';
  export const team = (m) => renderToString(<TeamOptions teamOptions={m} />);
  export const cycle = (list) => renderToString(<TeamOptions teamOptions={{ options: list, groups: [] }} />);`);

// Preact writes an empty value as a bare attribute; HTML parses both the same.
const same = (got, old, name) => sameHtml(got.replace(/<option value>/g, '<option value="">'), old, name);

test('team options equal the old option strings', () => {
  for (const c of S.TEAM_CASES) same(view.team(assignTeamOptions(S.TEAMS, c.selected, c.sala)), OLD.team[c.name], c.name);
});

test('cycle options equal the old option strings', () => {
  for (const c of S.CYCLE_CASES) same(view.cycle(cycleOptions(c.team, c.userId, c.rank, c.cycle)), OLD.cycle[c.name], c.name);
  same(view.cycle([{ value: '', label: '—' }]), OLD.dash, 'dash');
});
