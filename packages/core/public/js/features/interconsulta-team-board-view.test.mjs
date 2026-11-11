import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const NOW_MS = Date.UTC(2026, 9, 1, 18, 0, 0);
Date.now = () => NOW_MS; // the running timer prints elapsed time from Date.now()

const view = await loadJsx(import.meta.url, `import { IcRow, TeamBoard, TeamView } from './interconsulta-team-board-view.jsx';
  export const row = (p, o) => renderToString(<IcRow p={p} {...o} />);
  export const board = (p, t, now, o) => renderToString(<TeamBoard patients={p} teams={t} now={now} {...o} />);
  export const team = (p, t, now, id) => renderToString(<TeamView patients={p} teams={t} now={now} teamId={id} />);`);

const ci = (o) => ({ requestingService: 'Cardiología', reason: 'Valorar arritmia', triage: 'ic', ...o });
const ago = (min) => new Date(NOW_MS - min * 60000).toISOString();
const teams = ['A', 'B', 'C', 'D'].map((f) => ({ team_id: 'ic-' + f.toLowerCase(), name: 'Interconsultas ' + f, service: 'Interconsultas', sub_area_fraction: f }));
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

// Visible text only: drop tags, decode the entities the views escape.
const text = (h) => h.replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

test('every row shows its patient name, escaped', () => {
  for (const p of patients) {
    assert.ok(text(view.row(p, {})).toLowerCase().includes(p.nombre.toLowerCase()), p.nombre);
  }
  assert.doesNotMatch(view.row({ ...patients[0], nombre: 'PACIENTE <b>DEMO</b>' }, {}), /<b>/);
});

test('the grip only appears when asked for', () => {
  assert.doesNotMatch(view.row(patients[0], {}), /ic-line__grip/);
  assert.match(view.row(patients[0], { grip: true }), /ic-line__grip/);
});

test('Asignar board shows the patients by name', () => {
  assert.ok(text(view.board(patients, teams, WEEKDAY)).toLowerCase().includes('paciente demo uno'));
});

test('Asignar board with no teams has no drop zones', () => {
  assert.doesNotMatch(view.board(patients, [], WEEKDAY), /data-drop-team-id="/);
});

test('Asignar board with no patients shows the drop hint', () => {
  assert.match(view.board([], teams, WEEKDAY), /Suelta un paciente aquí/);
});

test('Mi equipo shows only the patients of that team', () => {
  const t = text(view.team(patients, teams, WEEKDAY, 'ic-a')).toLowerCase();
  assert.ok(t.includes('paciente demo uno'));
  assert.ok(!t.includes("jose o'brien"));
});

test('Asignar keeps its hooks: assign button on Por asignar rows, grip handle on team rows, drop zones', () => {
  const html = view.board(patients, teams, WEEKDAY);
  assert.match(html, /data-role="sin-equipo" data-drop-team-id>/);
  assert.match(html, /<button[^>]*data-ic-assign-open="p2"/);
  assert.match(html, /<span class="ic-line__grip" data-ic-assign-open="p1"/);
  assert.doesNotMatch(html, /<button[^>]*data-ic-assign-open="p1"/);
  for (const id of ['ic-a', 'ic-b', 'ic-c', 'ic-d']) assert.ok(html.includes('data-drop-team-id="' + id + '"'), id);
});

test('Mi equipo shows a Tomar button per unassigned patient only when a team is chosen', () => {
  assert.match(view.team(patients, teams, WEEKDAY, 'ic-a'), /data-ic-take="p2" data-ic-take-team="ic-a"/);
  assert.doesNotMatch(view.team(patients, teams, WEEKDAY, ''), /data-ic-take=/);
});
