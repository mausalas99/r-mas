/**
 * Fixed-shape demo patient set for the interconsulta team board (screenshots /
 * verify scripts only — see scripts/verify/interconsulta-demo-seed.mjs).
 * 8 recurring follow-ups spread across guardia/activo1/activo2/sin-equipo,
 * plus 2 VPOs and 2 new-today interconsultas for the on-call (guardia) team —
 * lands in Preop/Nuevas hoy per classifyInterconsultaBoardBucket.
 */

// Requesting specialty grouped by the kind of consult (medical follow-ups
// tend to come from medical services; VPOs come from the surgical service
// doing the operation; new-today ICs skew toward Urgencias/obstetric calls).
const FOLLOW_UPS = [
  { name: 'Rosa Delgado', servicio: 'Traumatología', edad: '72 años', sexo: 'F', cuarto: '301', cama: '01' },
  { name: 'Ignacio Vera', servicio: 'Cirugía general', edad: '65 años', sexo: 'M', cuarto: '302', cama: '02' },
  { name: 'Marta Solis', servicio: 'Ginecología', edad: '58 años', sexo: 'F', cuarto: '304', cama: '01' },
  { name: 'Emilio Rangel', servicio: 'Torre HU', edad: '61 años', sexo: 'M', cuarto: '305', cama: '02' },
  { name: 'Beatriz Nuñez', servicio: 'Neurocirugía', edad: '77 años', sexo: 'F', cuarto: '307', cama: '01' },
  { name: 'Carlos Peña', servicio: 'Traumatología', edad: '54 años', sexo: 'M', cuarto: '308', cama: '02' },
  { name: 'Diana Rios', servicio: 'Cirugía general', edad: '81 años', sexo: 'F', cuarto: '310', cama: '01' },
  { name: 'Felipe Cano', servicio: 'Ginecología', edad: '49 años', sexo: 'M', cuarto: '311', cama: '02' },
];

const VPOS = [
  { name: 'Sofia Aguilar', servicio: 'Cirugía general', edad: '45 años', sexo: 'F', cuarto: '201', cama: '01' },
  { name: 'Ramon Torres', servicio: 'Traumatología', edad: '38 años', sexo: 'M', cuarto: '203', cama: '02' },
];

const NEW_ICS = [
  { name: 'Lucia Mendoza', servicio: 'Torre HU', edad: '29 años', sexo: 'F', cuarto: 'URG', cama: '05' },
  { name: 'Hector Salinas', servicio: 'Ginecología', edad: '33 años', sexo: 'M', cuarto: '206', cama: '01' },
];

function isoAtOffsetDays(now, offsetDays) {
  const base = now instanceof Date ? new Date(now.getTime()) : new Date(String(now));
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString();
}

function basePatient(id, def, teamId, overrides) {
  return Object.assign(
    {
      id,
      nombre: def.name,
      registro: 'DEMO-' + id,
      edad: def.edad,
      sexo: def.sexo,
      isDemo: true,
      censusTeamId: teamId,
      cuarto: def.cuarto,
      cama: def.cama,
      servicio: def.servicio,
      interconsult_status: 'Active',
    },
    overrides
  );
}

/**
 * @param {{ guardia?: object|null, activo?: object[] }} roles
 * @param {Date|string} now
 * @returns {object[]}
 */
export function buildInterconsultaDemoPatients(roles, now) {
  const nowDate = now instanceof Date ? now : new Date(String(now || Date.now()));
  const guardiaId = roles && roles.guardia ? String(roles.guardia.team_id) : '';
  const activoIds = ((roles && roles.activo) || []).map((t) => String(t.team_id));
  // Cycle through guardia / activo1 / activo2 / unassigned so 8 names split 2 each,
  // even when fewer than 2 activo teams are configured (falls back toward guardia).
  const teamCycle = [guardiaId, activoIds[0] || guardiaId, activoIds[1] || activoIds[0] || guardiaId, ''];

  const followUps = FOLLOW_UPS.map((def, i) =>
    basePatient('ic-demo-fu-' + (i + 1), def, teamCycle[i % teamCycle.length], {
      interconsult_type: 'Follow-up',
      created_at: isoAtOffsetDays(nowDate, -3 - i),
      consultInfo: {
        requestingService: def.servicio,
        reason: 'Seguimiento de interconsulta previa',
        followUpStatus: 'en_curso',
      },
    })
  );

  const vpos = VPOS.map((def, i) =>
    basePatient('ic-demo-vpo-' + (i + 1), def, guardiaId, {
      interconsult_type: 'Ephemeral_VPO',
      created_at: isoAtOffsetDays(nowDate, 0),
      consultInfo: {
        requestingService: def.servicio,
        reason: 'Valoración preoperatoria',
        followUpStatus: 'pendiente',
      },
    })
  );

  const newIcs = NEW_ICS.map((def, i) =>
    basePatient('ic-demo-new-' + (i + 1), def, guardiaId, {
      interconsult_type: 'Follow-up',
      created_at: isoAtOffsetDays(nowDate, 0),
      consultInfo: {
        requestingService: def.servicio,
        reason: 'Nueva interconsulta',
        followUpStatus: 'pendiente',
      },
    })
  );

  return followUps.concat(vpos, newIcs);
}

/**
 * 4 fixed Interconsultas teams so the board renders deterministically even in
 * a fresh profile with no real teams configured yet (e.g. a verify-script
 * Electron profile) — getInterconsultaTeamRoles picks one on-call by date
 * against these same 4 A-D letters, same as it would for real teams.
 */
export function buildInterconsultaDemoTeams() {
  return [
    { team_id: 'ic-demo-team-a', name: 'Equipo Demo A', service: 'Interconsultas', sub_area_fraction: 'A' },
    { team_id: 'ic-demo-team-b', name: 'Equipo Demo B', service: 'Interconsultas', sub_area_fraction: 'B' },
    { team_id: 'ic-demo-team-c', name: 'Equipo Demo C', service: 'Interconsultas', sub_area_fraction: 'C' },
    { team_id: 'ic-demo-team-d', name: 'Equipo Demo D', service: 'Interconsultas', sub_area_fraction: 'D' },
  ];
}

/** @param {string} teamId */
export function isInterconsultaDemoTeamId(teamId) {
  return String(teamId || '').startsWith('ic-demo-team-');
}

/**
 * The board resolves each patient's lane via resolvePatientCensusTeamId(),
 * which checks explicit assignment rows first — it does NOT trust a
 * patient's own `censusTeamId` field. Turns each demo patient's `censusTeamId`
 * into a `{patient_id, team_id, effective_at, created_at}` row so the real
 * resolver places it in the intended lane.
 * @param {object[]} patients
 * @param {Date|string} now
 */
export function buildInterconsultaDemoAssignments(patients, now) {
  const nowDate = now instanceof Date ? now : new Date(String(now || Date.now()));
  const effectiveAt = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
  return (patients || [])
    .filter((p) => p && p.censusTeamId)
    .map((p) => ({
      patient_id: p.id,
      team_id: p.censusTeamId,
      effective_at: effectiveAt,
      created_at: effectiveAt,
    }));
}
