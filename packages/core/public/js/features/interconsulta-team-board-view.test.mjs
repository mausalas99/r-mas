import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const NOW_MS = Date.UTC(2026, 9, 1, 18, 0, 0);
Date.now = () => NOW_MS; // the running timer prints elapsed time from Date.now()

const view = await loadJsx(import.meta.url, `import { IcRow, TeamBoard, TeamView } from './interconsulta-team-board-view.jsx';
  export const row = (p, o) => renderToString(<IcRow p={p} {...o} />);
  export const board = (p, t, now, o) => renderToString(<TeamBoard patients={p} teams={t} now={now} {...o} />);
  export const team = (p, t, now, id) => renderToString(<TeamView patients={p} teams={t} now={now} teamId={id} />);`);

// Exact markup the string builders (icRowHtml, renderInterconsultaTeamBoardHtml, renderInterconsultaTeamViewHtml)
// made before the port, captured on the same fixtures below.
const OLD = JSON.parse(fs.readFileSync(new URL('./interconsulta-team-board-old-html.json', import.meta.url), 'utf8'));

const ci = (o) => ({ requestingService: 'Cardiología', reason: 'Valorar arritmia', triage: 'ic', ...o });
const ago = (min) => new Date(NOW_MS - min * 60000).toISOString();
const teams = ['A', 'B', 'C', 'D'].map((f) => ({ team_id: 'ic-' + f.toLowerCase(), name: 'Interconsultas ' + f, service: 'Interconsultas', sub_area_fraction: f }));
const teams5 = [...teams, { team_id: 'ic-e', name: 'Interconsultas E', service: 'Interconsultas' }];
const patients = [
  { id: 'p1', nombre: 'PACIENTE DEMO UNO', cuarto: '432', cama: '3', registro: 'R-100', censusTeamId: 'ic-a', consultInfo: ci({ receivedAt: ago(95) }) },
  { id: 'p2', nombre: 'MARIA DE LA CRUZ <X> & "Y"', cuarto: '', cama: '', censusTeamId: '', consultInfo: ci({ triage: 'vpo', requestingService: 'Servicio Raro', reason: '' }) },
  { id: 'p3', nombre: "JOSE O'BRIEN", cuarto: '12', cama: '', censusTeamId: 'ic-b', consultInfo: ci({ triage: 'critico', receivedAt: ago(180), answeredAt: ago(120) }) },
  { id: 'p4', nombre: 'ANA SEGUIMIENTO', cuarto: '5', cama: '1', censusTeamId: 'ic-c', consultInfo: ci({ triage: 'seguimiento' }) },
  { id: 'p5', nombre: 'LUIS ARCHIVADO', cuarto: '7', cama: '2', censusTeamId: 'ic-d', archived: true, consultInfo: ci({ triage: '' }) },
  { id: 'p6', nombre: 'SIN GRUPO', cuarto: '8', cama: '2', censusTeamId: 'ic-a', consultInfo: {} },
  { id: 'p7', nombre: 'OTRO SIN EQUIPO', cuarto: '9', cama: '4', censusTeamId: 'zzz', consultInfo: ci({ receivedAt: ago(5) }) },
];
const WEEKDAY = new Date(2026, 9, 1);
const WEEKEND = new Date(2026, 9, 3);

// Preact SSR writes `>` unescaped in text and empty attrs without `=""`; HTML parses both the same.
const norm = (s) => s
  .replace(/&gt;/g, '>')
  .replace(/ ([a-z-]+)=""/g, ' $1')
  .replace(/data-onclick-args='([^']*)'/g, 'data-onclick-args="$1"');

const same = (name, html) => {
  const a = norm(html), b = norm(OLD[name]);
  if (a !== b) { let i = 0; while (a[i] === b[i]) i++; assert.fail(name + ' differs at ' + i + '\nnew: ...' + a.slice(Math.max(0, i - 60), i + 120) + '\nold: ...' + b.slice(Math.max(0, i - 60), i + 120)); }
};

test('rows equal the old icRowHtml for every patient and option set', () => {
  for (const p of patients) {
    same('row:' + p.id + ':plain', view.row(p, {}));
    same('row:' + p.id + ':grip', view.row(p, { grip: true }));
    same('row:' + p.id + ':assign', view.row(p, { assign: true, grip: true }));
  }
});

test('Asignar board equals the old HTML', () => {
  same('board:weekday', view.board(patients, teams, WEEKDAY));
  same('board:weekday5', view.board(patients, teams5, WEEKDAY));
  same('board:hidepost', view.board(patients, teams, WEEKDAY, { hidePostguardia: true }));
  same('board:weekend', view.board(patients, teams, WEEKEND));
  same('board:guardiaonly', view.board(patients, teams, WEEKDAY, { filterGuardiaOnly: true }));
  same('board:noteams', view.board(patients, [], WEEKDAY));
  same('board:nopatients', view.board([], teams, WEEKDAY));
});

test('Mi equipo view equals the old HTML', () => {
  for (const id of ['ic-a', 'ic-b', 'ic-d', 'ic-zz', '']) same('view:' + id, view.team(patients, teams, WEEKDAY, id));
  same('view:empty', view.team([], teams, WEEKDAY, 'ic-a'));
});

test('Asignar keeps its hooks: assign button on Por asignar rows, grip handle on team rows, drop zones', () => {
  const html = view.board(patients, teams, WEEKDAY);
  assert.match(norm(html), /data-role="sin-equipo" data-drop-team-id>/);
  assert.match(html, /<button[^>]*data-ic-assign-open="p2"/);
  assert.match(html, /<span class="ic-line__grip" data-ic-assign-open="p1"/);
  assert.doesNotMatch(html, /<button[^>]*data-ic-assign-open="p1"/);
  for (const id of ['ic-a', 'ic-b', 'ic-c', 'ic-d']) assert.ok(html.includes('data-drop-team-id="' + id + '"'), id);
  assert.match(view.board([], teams, WEEKDAY), /Suelta un paciente aquí/);
});

test('Mi equipo shows a Tomar button per unassigned patient only when a team is chosen', () => {
  assert.match(view.team(patients, teams, WEEKDAY, 'ic-a'), /data-ic-take="p2" data-ic-take-team="ic-a"/);
  assert.doesNotMatch(view.team(patients, teams, WEEKDAY, ''), /data-ic-take=/);
});

test('a name with markup is escaped', () => {
  const html = view.row({ ...patients[0], nombre: 'PACIENTE <b>DEMO</b>' }, {});
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b>/);
});
