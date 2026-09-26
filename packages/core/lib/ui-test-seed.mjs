/**
 * Synthetic patient roster + lab fixtures for the isolated UI test mode
 * (R_PLUS_UI_TEST_MODE=1). Runs once, on a fresh test-mode profile's first
 * successful unlock (db:auto-unlock at boot, or db:unlock) — see
 * seedUiTestModeIfNeeded in lib/db/ipc-handlers-register-core.mjs.
 *
 * Writes through the same functions the real app uses:
 * - `upsertBlob` (lib/db/clinical-blobs.mjs) is exactly what db:clinical-save-all
 *   calls — no hand-rolled SQL.
 * - `procesarLabs` (public/js/labs.js) is the real SOME lab-report parser —
 *   the same engine lab-bulk-paste.mjs calls per report chunk — so lab
 *   history here is real parser output, not faked resLabs arrays.
 *
 * ponytail: the bulk multi-patient paste UI (public/js/lab-bulk-paste.mjs)
 * also needs renderer app-state (getLabHistory/findPatientByRegistro), which
 * isn't available in the main process. Seeding here calls procesarLabs
 * directly instead of the full bulk-paste orchestration — real parser, not
 * the multi-patient split/merge layer on top of it. Upgrade: move this seed
 * to a renderer boot hook if bulk-paste-screen coverage matters later.
 */
import { upsertBlob } from './db/clinical-blobs.mjs';
import { createTeam, listActiveTeams } from './db/clinical-access-teams-core.mjs';
import { ensureClinicalUser, findClinicalUserByUsername } from './db/clinical-access-users.mjs';
import { joinTeam } from './db/clinical-access-teams-membership.mjs';
import { assignPatientToTeam } from './db/clinical-access-assignments.mjs';
import { procesarLabs } from '../public/js/labs.js';
import { extractParsedValues } from '../public/js/features/diagrams-parse.mjs';
import { DEMO_SOME_LAB_REPORT, OLDER_DEMO_SOME_LAB_REPORT } from '../public/js/tour-demo-some-lab.mjs';

/**
 * Fixed local identity for the isolated UI test mode — matched by preload.js,
 * which seeds this same username into localStorage so the renderer's
 * bootstrap (`resolveBootstrapClinicalUser`) attaches to this DB row instead
 * of provisioning a fresh machine-bound user, and onboarding never shows
 * (`hasJoinedClinicalTeam()` short-circuits every onboarding gate once this
 * user is on a team — see needsProfileOnboarding in clinical-onboarding-gates.mjs).
 */
export const UI_TEST_USERNAME = 'uitest';
const UI_TEST_USER_SALA = 'Sala 1';

/**
 * Real sala values (lib/clinical-salas.mjs) — one starter rotation team per
 * sala, so "Mi rotación → Explorar" has something to join no matter which
 * sala the tester picks during onboarding (that choice happens after this
 * seed runs, at db:unlock setup time, so we can't target just one).
 */
const SALAS = ['Sala 1', 'Sala 2', 'Sala E', 'Torre HU', 'Área A/Pensionistas', 'Interconsultas', 'UX', 'Eme'];

/** teams.service has a narrower CHECK enum (lib/db/schema-primitives.mjs) than sala — Sala 1/2/E all map to 'Sala'. */
const SALA_TO_SERVICE = {
  'Sala 1': 'Sala',
  'Sala 2': 'Sala',
  'Sala E': 'Sala',
  'Torre HU': 'Torre HU',
  'Área A/Pensionistas': 'Área A/Pensionistas',
  Interconsultas: 'Interconsultas',
  UX: 'UX',
  Eme: 'Eme',
};

/** Synthetic-only team labels — not real teams table rows, just a grouping field. */
export const UI_TEST_TEAMS = {
  CENSO: 'ui-test-team-censo',
  SALA: 'ui-test-team-sala',
  GUARDIA: 'ui-test-team-guardia',
};


/** @type {{nombre:string, edad:string, sexo:'M'|'F', servicio:string, team:string, interconsultType?:string, interconsultStatus?:string, reason?:string, labs?:'structured'|'raw-fixture'}[]} */
const ROSTER = [
  { nombre: 'Rosa Delgado', edad: '72 años', sexo: 'F', servicio: 'Sala', team: UI_TEST_TEAMS.CENSO, labs: 'structured' },
  { nombre: 'Ignacio Vera', edad: '65 años', sexo: 'M', servicio: 'Torre HU', team: UI_TEST_TEAMS.CENSO, labs: 'structured' },
  { nombre: 'Marta Solis', edad: '58 años', sexo: 'F', servicio: 'Eme', team: UI_TEST_TEAMS.CENSO, labs: 'structured' },
  { nombre: 'Emilio Rangel', edad: '61 años', sexo: 'M', servicio: 'UX', team: UI_TEST_TEAMS.CENSO },
  { nombre: 'Beatriz Nuñez', edad: '77 años', sexo: 'F', servicio: 'Área A/Pensionistas', team: UI_TEST_TEAMS.CENSO, labs: 'structured' },
  { nombre: 'Carlos Peña', edad: '54 años', sexo: 'M', servicio: 'Sala', team: UI_TEST_TEAMS.SALA, labs: 'structured' },
  { nombre: 'Diana Rios', edad: '81 años', sexo: 'F', servicio: 'Torre HU', team: UI_TEST_TEAMS.SALA },
  { nombre: 'Felipe Cano', edad: '49 años', sexo: 'M', servicio: 'Eme', team: UI_TEST_TEAMS.SALA, labs: 'structured' },
  { nombre: 'Sofia Aguilar', edad: '45 años', sexo: 'F', servicio: 'UX', team: UI_TEST_TEAMS.SALA, labs: 'structured' },
  { nombre: 'Ramon Torres', edad: '38 años', sexo: 'M', servicio: 'Sala', team: UI_TEST_TEAMS.SALA },
  { nombre: 'Lucia Mendoza', edad: '29 años', sexo: 'F', servicio: 'Eme', team: UI_TEST_TEAMS.GUARDIA, labs: 'structured' },
  { nombre: 'Hector Salinas', edad: '33 años', sexo: 'M', servicio: 'Eme', team: UI_TEST_TEAMS.GUARDIA },
  {
    nombre: 'Ofelia Marín',
    edad: '68 años',
    sexo: 'F',
    servicio: 'Torre HU',
    team: UI_TEST_TEAMS.CENSO,
    interconsultType: 'Follow-up',
    interconsultStatus: 'Active',
    reason: 'Seguimiento de interconsulta de Nefrología',
    labs: 'structured',
  },
  {
    nombre: 'Arturo Casas',
    edad: '71 años',
    sexo: 'M',
    servicio: 'Sala',
    team: UI_TEST_TEAMS.CENSO,
    interconsultType: 'Follow-up',
    interconsultStatus: 'Pending',
    reason: 'Seguimiento de interconsulta de Cardiología',
  },
  {
    nombre: 'Patricia Ovando',
    edad: '55 años',
    sexo: 'F',
    servicio: 'UX',
    team: UI_TEST_TEAMS.GUARDIA,
    interconsultType: 'Ephemeral_VPO',
    interconsultStatus: 'Pending',
    reason: 'Valoración preoperatoria',
    labs: 'raw-fixture',
  },
  {
    nombre: 'Jorge Beltrán',
    edad: '63 años',
    sexo: 'M',
    servicio: 'Área A/Pensionistas',
    team: UI_TEST_TEAMS.CENSO,
    interconsultType: 'Under',
    interconsultStatus: 'Resolved',
    reason: 'Bajo manejo conjunto con Cirugía general',
    labs: 'raw-fixture',
  },
  { nombre: 'Silvia Aranda', edad: '40 años', sexo: 'F', servicio: 'Sala', team: UI_TEST_TEAMS.SALA, labs: 'raw-fixture' },
  { nombre: 'Manuel Ibarra', edad: '75 años', sexo: 'M', servicio: 'Torre HU', team: UI_TEST_TEAMS.CENSO },
];

/** @param {Date} d @returns {string} DD/MM/YYYY */
function fechaDMY(d) {
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
}

/**
 * Real SOME-report parse, not a faked resLabs array.
 * @param {string} id @param {string} reportText @param {Date} date
 */
function buildLabHistoryEntry(id, reportText, date) {
  const resLabs = procesarLabs(reportText).resLabs;
  return {
    id,
    fecha: fechaDMY(date),
    hora: '08:00',
    resLabs,
    parsed: extractParsedValues(resLabs),
    sourceText: reportText,
  };
}

/**
 * @param {Date} [now]
 * @returns {{ patients: object[], labHistory: Record<string, object[]> }}
 */
export function buildUiTestRoster(now) {
  const today = now instanceof Date ? now : new Date(now || Date.now());
  const patients = [];
  const labHistory = {};

  ROSTER.forEach((def, i) => {
    const id = 'ui-test-' + (i + 1);
    const registro = 'UITEST-' + String(i + 1).padStart(4, '0');
    patients.push({
      id,
      nombre: def.nombre,
      registro,
      edad: def.edad,
      sexo: def.sexo,
      servicio: def.servicio,
      cuarto: String(300 + i),
      cama: i % 2 === 0 ? '01' : '02',
      censusTeamId: def.team,
      interconsult_type: def.interconsultType || 'None',
      interconsult_status: def.interconsultStatus || 'Pending',
      created_at: new Date(today.getTime() - i * 3600 * 1000).toISOString(),
      ...(def.reason
        ? { consultInfo: { requestingService: def.servicio, reason: def.reason, followUpStatus: 'en_curso' } }
        : {}),
    });

    // Two sets on different dates, so Tendencias has something to chart.
    if (def.labs === 'structured') {
      labHistory[id] = [
        buildLabHistoryEntry(id + '-l1', OLDER_DEMO_SOME_LAB_REPORT, new Date(today.getTime() - 5 * 86400000)),
        buildLabHistoryEntry(id + '-l2', DEMO_SOME_LAB_REPORT, new Date(today.getTime() - 2 * 86400000)),
      ];
    } else if (def.labs === 'raw-fixture') {
      labHistory[id] = [
        buildLabHistoryEntry(id + '-l1', OLDER_DEMO_SOME_LAB_REPORT, new Date(today.getTime() - 3 * 86400000)),
        buildLabHistoryEntry(id + '-l2', DEMO_SOME_LAB_REPORT, today),
      ];
    }
  });

  return { patients, labHistory };
}

/**
 * Writes the roster into the fresh profile's clinical_blob table via the
 * real upsertBlob path (same one db:clinical-save-all uses).
 * @param {import('better-sqlite3').Database} db
 * @param {Date} [now]
 */
export function seedUiTestData(db, now) {
  const { patients, labHistory } = buildUiTestRoster(now);
  upsertBlob(db, 'patients', JSON.stringify(patients));
  upsertBlob(db, 'labHistory', JSON.stringify(labHistory));
  return { patientCount: patients.length, labHistoryPatientCount: Object.keys(labHistory).length };
}

/**
 * One starter rotation team per real sala, via the real `createTeam` write
 * path (same one the "Crear nuevo equipo" screen calls) — no synthetic user
 * to own it (`createdBy: null` is a valid, unowned system team), left
 * unjoined so a tester exercises the real "Unirme" flow on a fresh profile.
 * @param {import('better-sqlite3').Database} db
 */
export function seedUiTestTeams(db) {
  return SALAS.map((sala) =>
    createTeam(db, { name: `Equipo ${sala}`, service: SALA_TO_SERVICE[sala], sala, onCallDayIndex: 0 })
  );
}

/** Grouping field → the real seeded team whose members see those patients. */
const GROUP_SALA = {
  [UI_TEST_TEAMS.CENSO]: 'Sala 1',
  [UI_TEST_TEAMS.SALA]: 'Sala 2',
  [UI_TEST_TEAMS.GUARDIA]: 'Eme',
};

/**
 * Puts each seeded patient on a real seeded team (real `assignPatientToTeam`,
 * same write as the team picker), so a user who joins that team sees them.
 * Call after `seedUiTestData` and `seedUiTestTeams`.
 * @param {import('better-sqlite3').Database} db
 * @param {Date} [now]
 */
export function seedUiTestAssignments(db, now) {
  const effectiveAt = (now instanceof Date ? now : new Date()).toISOString();
  const teamBySala = new Map(listActiveTeams(db).map((t) => [t.sala, t.team_id]));
  for (const p of buildUiTestRoster(now).patients) {
    const teamId = teamBySala.get(GROUP_SALA[p.censusTeamId]);
    if (teamId) assignPatientToTeam(db, { patientId: p.id, teamId, effectiveAt });
  }
}

/**
 * Fixed local `uitest` account, already on the seeded Sala 1 team — via the
 * real `ensureClinicalUser`/`joinTeam` write paths — so a fresh profile
 * boots straight past onboarding instead of showing "Crea tu perfil".
 * Call after `seedUiTestTeams` so the Sala 1 team already exists to join.
 * @param {import('better-sqlite3').Database} db
 */
export function seedUiTestUser(db) {
  const existing = findClinicalUserByUsername(db, UI_TEST_USERNAME);
  if (existing) return existing;
  const user = ensureClinicalUser(db, {
    clientId: UI_TEST_USERNAME,
    rank: 'R2',
    clinicalName: 'Dra. UI Test',
    sala: UI_TEST_USER_SALA,
  });
  const team = listActiveTeams(db).find((t) => t.sala === UI_TEST_USER_SALA);
  if (team) joinTeam(db, team.team_id, user.userId);
  return user;
}
