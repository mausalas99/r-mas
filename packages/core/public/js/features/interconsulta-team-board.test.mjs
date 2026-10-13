import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icRowHtml, stepFocusId, guardiaTeamLabel, assignKeyToTeamId, renderInterconsultaTeamBoardHtml, renderInterconsultaTeamViewHtml } from './interconsulta-team-board.mjs';

const base = { id: 'p1', nombre: 'PACIENTE DEMO UNO', cuarto: '432', cama: '3', consultInfo: { requestingService: 'Cardiología', reason: 'Valorar arritmia', triage: 'ic' } };
const received = { ...base, consultInfo: { ...base.consultInfo, receivedAt: new Date(Date.now() - 60000).toISOString() } };

test('row shows bed, title-cased name, service and motivo', () => {
  const html = icRowHtml(base);
  assert.match(html, /class="ic-line sv-card-wrap"/);
  assert.match(html, /data-ic-line/);
  assert.match(html, /data-patient-id="p1"/);
  assert.match(html, />432 · 3</);
  assert.match(html, />Paciente Demo Uno</);
  assert.match(html, />Cardiología</);
  assert.match(html, />Valorar arritmia</);
});

test('received but not answered shows the stop timer button', () => {
  assert.match(icRowHtml(received), /data-ic-timer="stop"/);
});

test('seguimiento has no timer markup and plain muted label', () => {
  const html = icRowHtml({ ...base, consultInfo: { ...base.consultInfo, triage: 'seguimiento' } });
  assert.doesNotMatch(html, /data-ic-timer/);
  assert.match(html, /ic-line__muted">Seguimiento</);
});

test('missing motivo shows Sin motivo', () => {
  const html = icRowHtml({ ...base, consultInfo: { requestingService: 'Cardiología', triage: 'ic' } });
  assert.match(html, />Sin motivo</);
});

test('name with markup is escaped', () => {
  const html = icRowHtml({ ...base, nombre: 'PACIENTE <b>DEMO</b>' });
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;/);
});

test('stepFocusId moves to the next and previous id', () => {
  assert.equal(stepFocusId(['a', 'b', 'c'], 'a', 1), 'b');
  assert.equal(stepFocusId(['a', 'b', 'c'], 'c', -1), 'b');
});

test('stepFocusId clamps at both ends', () => {
  assert.equal(stepFocusId(['a', 'b', 'c'], 'c', 1), 'c');
  assert.equal(stepFocusId(['a', 'b', 'c'], 'a', -1), 'a');
});

test('stepFocusId returns the first id when current is missing, and empty for empty list', () => {
  assert.equal(stepFocusId(['a', 'b'], 'zz', 1), 'a');
  assert.equal(stepFocusId(['a', 'b'], 'zz', -1), 'a');
  assert.equal(stepFocusId([], 'a', 1), '');
});

test('guardiaTeamLabel returns the on-call interconsult team name', () => {
  const teams = [
    { team_id: 'ic-a', name: 'Interconsultas A', service: 'Interconsultas', sub_area_fraction: 'A' },
    { team_id: 'ic-b', name: 'Interconsultas B', service: 'Interconsultas', sub_area_fraction: 'B' },
  ];
  assert.equal(guardiaTeamLabel(teams, new Date(2026, 9, 1)), 'Interconsultas A');
  assert.equal(guardiaTeamLabel(teams, new Date(2026, 9, 2)), 'Interconsultas B');
});

test('guardiaTeamLabel returns empty when no team is on guardia', () => {
  assert.equal(guardiaTeamLabel([], new Date(2026, 9, 1)), '');
  const noFraction = [{ team_id: 'ic-x', name: 'Interconsultas X', service: 'Interconsultas' }];
  assert.equal(guardiaTeamLabel(noFraction, new Date(2026, 9, 1)), '');
});

const teams = ["A", "B", "C", "D"].map((f) => ({ team_id: "ic-" + f.toLowerCase(), name: "Interconsultas " + f, service: "Interconsultas", sub_area_fraction: f }));
const NOW = new Date(2026, 9, 1);
const assigned = { ...base, id: "p1", censusTeamId: "ic-a" };
const unassigned = { ...base, id: "p2", nombre: "PACIENTE DEMO DOS", censusTeamId: "" };

test("Asignar shows the Por asignar section with an assign button for unassigned patients", () => {
  const html = renderInterconsultaTeamBoardHtml([assigned, unassigned], teams, NOW);
  assert.match(html, /<section class="ic-board-section ic-board-section--sin" data-role="sin-equipo" data-drop-team-id="">/);
  assert.match(html, /Por asignar <span>1<\/span>/);
  assert.match(html, /data-ic-assign-open="p2"/);
  assert.match(html, /<span class="ic-line__grip" data-ic-assign-open="p1"/);
  assert.doesNotMatch(html, /<button[^>]*data-ic-assign-open="p1"/);
});

test("Asignar has no Por asignar section when every patient has a team", () => {
  const html = renderInterconsultaTeamBoardHtml([assigned], teams, NOW);
  assert.doesNotMatch(html, /data-role="sin-equipo"/);
  assert.doesNotMatch(html, /<button[^>]*data-ic-assign-open/);
});

test("Asignar team sections are drop zones and empty teams say so", () => {
  const html = renderInterconsultaTeamBoardHtml([assigned], teams, NOW);
  for (const id of ["ic-a", "ic-b", "ic-c", "ic-d"]) assert.ok(html.includes('data-drop-team-id="' + id + '"'), id);
  assert.match(html, /Suelta un paciente aquí/);
  assert.match(html, /class="ic-line sv-card-wrap ic-line--grip"/);
});

test("Mi equipo shows a Tomar button per unassigned patient when a team is chosen", () => {
  const html = renderInterconsultaTeamViewHtml([assigned, unassigned], teams, NOW, "ic-a");
  assert.match(html, /class="ic-take"/);
  assert.match(html, /data-ic-take="p2" data-ic-take-team="ic-a"/);
  assert.match(html, /Sin equipo/);
});

test("Mi equipo has no take strip when nobody is unassigned or no team is given", () => {
  assert.doesNotMatch(renderInterconsultaTeamViewHtml([assigned], teams, NOW, "ic-a"), /class="ic-take"/);
  assert.doesNotMatch(renderInterconsultaTeamViewHtml([assigned, unassigned], teams, NOW, ""), /data-ic-take=/);
});

test('assignKeyToTeamId maps a digit to the Nth option id', () => {
  const opts = [{ id: 'T1', label: 'A' }, { id: 'T2', label: 'B' }];
  assert.equal(assignKeyToTeamId(opts, '2'), 'T2');
  assert.equal(assignKeyToTeamId(opts, '1'), 'T1');
});

test('assignKeyToTeamId returns empty for a digit beyond the list, a non-digit, or no options', () => {
  const opts = [{ id: 'T1', label: 'A' }];
  assert.equal(assignKeyToTeamId(opts, '3'), '');
  assert.equal(assignKeyToTeamId(opts, '0'), '');
  assert.equal(assignKeyToTeamId(opts, 'a'), '');
  assert.equal(assignKeyToTeamId([], '1'), '');
  assert.equal(assignKeyToTeamId(undefined, '1'), '');
});
