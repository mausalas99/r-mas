import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { PerfilEquipo } from './teams-roster-interactions-view.jsx';
  export const equipo = (p) => renderToString(<PerfilEquipo {...p} />);`);

// Markup renderPerfilEquipo wrote before the port, captured on the same teams as below.
const OLD = createRequire(import.meta.url)('./teams-roster-interactions-view-old-html.json');

const SALAS = ['Sala 1', 'Sala <2> & "x"'];
const ALL = '__all__';
const options = (filter) => [{ value: ALL, label: 'Todas las salas' }, ...SALAS.map((s) => ({ value: s, label: s }))]
  .map((o) => ({ ...o, selected: o.value === filter }));
// Pills as the .mjs maps them: name fallback, disabled/title only for teams you cannot join.
const pill = (id, name, pressed, disabled = false, title = '') => ({ id, name, pressed, disabled, title });
const t1 = pill('t1', 'Medicina <1>', true);
const t2 = pill('t2', "O'Brien & Co", false, true, 'Equipo "lleno" <ya>');
const t3 = pill('t3', 'Equipo', false);
const t4 = pill('t4', 'Sin razón', false, true);

test('Equipo section equals the old HTML (all salas, one sala, empty, no own team)', () => {
  sameHtml(view.equipo({ current: 'Medicina <1>', options: options(ALL), teams: [t1, t2, t3, t4] }), OLD.all, 'all');
  sameHtml(view.equipo({ current: 'Medicina <1>', options: options('Sala 1'), teams: [t1, t2, t4] }), OLD.sala1, 'sala1');
  sameHtml(view.equipo({ current: 'Medicina <1>', options: options(SALAS[1]), teams: [t3] }), OLD.sala2, 'sala2');
  sameHtml(view.equipo({ current: 'Sin equipo', options: options('Sala 1'), teams: [] }), OLD.empty, 'empty');
  sameHtml(view.equipo({ current: 'Sin equipo', options: options(ALL), teams: [t2, t3, t4] }), OLD.noMine, 'noMine');
});

test('pressed, disabled and the join reason show on the right pills', () => {
  const html = view.equipo({ current: 'x', options: options(ALL), teams: [t1, t2, t3] });
  assert.match(html, /data-perfil-equipo-team="t1" aria-pressed="true"/);
  assert.match(html, /data-perfil-equipo-team="t2" aria-pressed="false" disabled/);
  assert.equal((html.match(/ disabled/g) || []).length, 1);
  assert.equal((html.match(/ title=/g) || []).length, 1);
  assert.equal((html.match(/ selected/g) || []).length, 1);
});
