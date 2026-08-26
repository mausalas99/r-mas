import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  renderInterconsultaTeamBoardHtml,
  mountInterconsultaTeamBoard,
} from './interconsulta-team-board.mjs';

const NOW = new Date('2026-08-25T12:00:00Z');

function team(id, service, onCallDayIndex, salaOffset = 0) {
  return {
    team_id: id,
    name: 'Equipo ' + id,
    service,
    sub_area_fraction: 'A',
    on_call_day_index: onCallDayIndex,
    _salaOffset: salaOffset,
  };
}

// Build 4 interconsulta teams cycling A-D, one on call today by day-of-year mod 4.
function buildTeams() {
  // isOnCallToday relies on cycle-letters; keep it simple by directly using
  // getInterconsultaTeamRoles's real behavior via distinct sub_area letters A-D.
  return [
    { team_id: 't-a', name: 'Equipo A', service: 'Interconsultas', sub_area_fraction: 'A' },
    { team_id: 't-b', name: 'Equipo B', service: 'Interconsultas', sub_area_fraction: 'B' },
    { team_id: 't-c', name: 'Equipo C', service: 'Interconsultas', sub_area_fraction: 'C' },
    { team_id: 't-d', name: 'Equipo D', service: 'Interconsultas', sub_area_fraction: 'D' },
  ];
}

function patient(id, teamId, overrides = {}) {
  return {
    id,
    name: 'Paciente ' + id,
    censusTeamId: teamId,
    interconsult_status: 'Active',
    interconsult_type: 'Follow-up',
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

test('renders 4 lanes', () => {
  const teams = buildTeams();
  const patients = [patient('p1', 't-a'), patient('p2', 't-b')];
  const html = renderInterconsultaTeamBoardHtml(patients, teams, NOW);
  const laneCount = (html.match(/ic-board-lane/g) || []).length;
  // each lane emits the class twice? no, once per section tag class attr; count sections
  const sectionCount = (html.match(/<section class="ic-board-lane/g) || []).length;
  assert.equal(sectionCount, 4);
  assert.ok(laneCount >= 4);
});

test('each lane splits into a fixed head and a scrollable body, so a lane with many patients scrolls instead of growing the page', () => {
  const teams = buildTeams();
  const patients = Array.from({ length: 30 }, (_, i) => patient('p' + i, 't-a'));
  const html = renderInterconsultaTeamBoardHtml(patients, teams, NOW);
  const guardiaLane = html.slice(html.indexOf('data-role="guardia"'), html.indexOf('data-role="activo"'));
  assert.match(guardiaLane, /<div class="ic-board-lane__head">[\s\S]*<\/div>/);
  assert.match(guardiaLane, /<div class="ic-board-lane__body"[^>]*>[\s\S]*<\/div>/);
  // The head (title) must come before the scrollable body.
  assert.ok(guardiaLane.indexOf('ic-board-lane__head') < guardiaLane.indexOf('ic-board-lane__body'));
});

test('guardia lane shows Preop / Nuevas hoy bucket, activo lanes do not', () => {
  const teams = buildTeams();
  const patients = [
    patient('preop1', 't-a', { interconsult_type: 'Ephemeral_VPO' }),
  ];
  const html = renderInterconsultaTeamBoardHtml(patients, teams, NOW);
  assert.ok(html.includes('Preop / Nuevas hoy'));
  // Guardia lane block must contain the preop section
  const guardiaLane = html.slice(html.indexOf('data-role="guardia"'), html.indexOf('data-role="activo"'));
  assert.ok(guardiaLane.includes('Preop / Nuevas hoy'));
});

test('activo lanes render exactly 2 bucket sections (no Preop)', () => {
  const teams = buildTeams();
  const html = renderInterconsultaTeamBoardHtml([], teams, NOW);
  const activoLaneMatches = [...html.matchAll(/<section class="ic-board-lane ic-board-lane--activo"[\s\S]*?<\/section>/g)];
  assert.equal(activoLaneMatches.length, 2);
  for (const m of activoLaneMatches) {
    const bucketSections = (m[0].match(/ic-board-bucket"/g) || []).length + (m[0].match(/ic-board-bucket--accent"/g) || []).length;
    assert.equal(bucketSections, 2);
    assert.ok(!m[0].includes('Preop / Nuevas hoy'));
  }
});

test('postguardia lane stays open (not dimmed/closed): shows the note but still renders buckets and accepts drops', () => {
  const teams = buildTeams();
  const html = renderInterconsultaTeamBoardHtml([], teams, NOW);
  const postLane = html.slice(html.indexOf('data-role="postguardia"'));
  assert.ok(postLane.includes('No presencial hoy'));
  assert.ok(postLane.includes('ic-board-bucket'));
  assert.match(postLane, /ic-board-lane__body" data-drop-team-id="[^"]*"/);
});

test('filterGuardiaOnly narrows to the guardia lane Preop/Nuevas-hoy bucket only', () => {
  const teams = buildTeams();
  const patients = [
    patient('preop1', 't-a', { interconsult_type: 'Ephemeral_VPO' }),
    patient('pend1', 't-a'),
    patient('other1', 't-b'),
  ];
  const html = renderInterconsultaTeamBoardHtml(patients, teams, NOW, true);
  assert.ok(html.includes('Preop / Nuevas hoy'));
  assert.ok(!html.includes('data-role="activo"'));
  assert.ok(!html.includes('data-role="postguardia"'));
  assert.ok(!html.includes('Pendientes'));
  const sectionCount = (html.match(/<section class="ic-board-lane/g) || []).length;
  assert.equal(sectionCount, 1);
});

test('guardia lane has no rollover button (removed)', () => {
  const teams = buildTeams();
  const html = renderInterconsultaTeamBoardHtml([], teams, NOW);
  assert.ok(!html.includes('ic-board-rollover-btn'));
  assert.ok(!html.includes('Terminar guardia y repartir pacientes'));
});

test('a patient with no/unmatched censusTeamId renders in the "Sin equipo" lane instead of being dropped', () => {
  const teams = buildTeams();
  const patients = [
    patient('p1', 't-a'),
    patient('orphan1', ''),
    patient('orphan2', 'no-such-team'),
  ];
  const html = renderInterconsultaTeamBoardHtml(patients, teams, NOW);
  assert.ok(html.includes('Sin equipo'));
  assert.ok(html.includes('data-patient-id="orphan1"'));
  assert.ok(html.includes('data-patient-id="orphan2"'));
});

test('every lane body carries data-drop-team-id, including "" for Sin equipo', () => {
  const teams = buildTeams();
  const patients = [patient('orphan1', '')];
  const html = renderInterconsultaTeamBoardHtml(patients, teams, NOW);
  assert.match(html, /data-role="guardia"[\s\S]*?data-drop-team-id="t-a"/);
  assert.match(html, /data-role="sin-equipo"[\s\S]*?data-drop-team-id=""/);
});

test('dropping a patient card on a lane body calls opts.assignTeam with the patient and target team ids', async () => {
  if (typeof document === 'undefined') return; // no DOM env available; skip
  const host = document.createElement('div');
  document.body.appendChild(host);
  try {
    const teams = buildTeams();
    const patients = [patient('p1', 't-a')];
    let assignArgs = null;
    let called = null;
    mountInterconsultaTeamBoard(host, patients, teams, {
      now: NOW,
      assignTeam: async (patientId, teamId) => {
        assignArgs = { patientId, teamId };
        return { ok: true };
      },
      onAssignTeam: (r) => (called = r),
    });
    const card = host.querySelector('.patient-card[data-patient-id="p1"]');
    assert.ok(card);
    assert.equal(card.draggable, true);
    const targetBody = host.querySelector('[data-role="activo"] .ic-board-lane__body');
    assert.ok(targetBody);
    const targetTeamId = targetBody.getAttribute('data-drop-team-id');

    // jsdom doesn't implement a real DataTransfer, so attach a stub one
    // directly to the dispatched events instead of relying on the browser
    // default drag/drop payload.
    const dataTransfer = {
      _data: {},
      setData(type, value) {
        this._data[type] = value;
      },
      getData(type) {
        return this._data[type] || '';
      },
    };
    const dragstart = new Event('dragstart', { bubbles: true, cancelable: true });
    dragstart.dataTransfer = dataTransfer;
    card.dispatchEvent(dragstart);
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    drop.dataTransfer = dataTransfer;
    targetBody.dispatchEvent(drop);
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(assignArgs, { patientId: 'p1', teamId: targetTeamId });
    assert.ok(called);
    assert.equal(called.ok, true);
  } finally {
    host.remove();
  }
});

