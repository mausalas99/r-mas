/**
 * Equipos del censo de guardia — agosto 2026.
 * Fuente: rotación mensual (sin UCIA / POSQX / Infecto).
 *
 * Naming:
 * - Sala 1/2/E y Torre HU: titular en negritas → Dr./Dra. + nombre
 * - Interconsultas: líderes en azul (pares combinados)
 * - UX / Eme / Área A: azul; si no hay azul, negritas
 */
import { clinicalServiceForSala } from '../clinical-salas.mjs';

/** @typedef {{ sala: string, cycle: string, name: string }} AgostoTeamSpec */

/** @type {AgostoTeamSpec[]} */
export const AGOSTO_2026_TEAMS = Object.freeze([
  { sala: 'Sala 1', cycle: 'A', name: 'Dr. Adrián' },
  { sala: 'Sala 1', cycle: 'B', name: 'Dra. Fernanda' },
  { sala: 'Sala 1', cycle: 'C', name: 'Dra. Katiria' },
  { sala: 'Sala 1', cycle: 'D', name: 'Dr. Ricardo' },

  { sala: 'Sala 2', cycle: 'A', name: 'Dr. Christian' },
  { sala: 'Sala 2', cycle: 'B', name: 'Dr. Ignacio' },
  { sala: 'Sala 2', cycle: 'C', name: 'Dra. Leslie' },
  { sala: 'Sala 2', cycle: 'D', name: 'Dra. Mariana' },

  { sala: 'Sala E', cycle: 'A', name: 'Dr. Eduardo' },
  { sala: 'Sala E', cycle: 'B', name: 'Dr. Oscar' },
  { sala: 'Sala E', cycle: 'C', name: 'Dr. Jin' },
  { sala: 'Sala E', cycle: 'D', name: 'Dra. Marisol' },

  { sala: 'Torre HU', cycle: 'A', name: 'Dr. Diego' },
  { sala: 'Torre HU', cycle: 'B', name: 'Dra. Mónica' },
  { sala: 'Torre HU', cycle: 'C', name: 'Dr. Juan' },
  { sala: 'Torre HU', cycle: 'D', name: 'Dra. Valeria' },

  { sala: 'Interconsultas', cycle: 'A', name: 'Dra. Astrid/Arturo' },
  { sala: 'Interconsultas', cycle: 'B', name: 'Dr. Axel/Daniela' },
  { sala: 'Interconsultas', cycle: 'C', name: 'Dra. Ale/Eliana' },
  { sala: 'Interconsultas', cycle: 'D', name: 'Dra. Valeria' },

  { sala: 'UX', cycle: 'A', name: 'Dra. Laura' },
  { sala: 'UX', cycle: 'B', name: 'Dra. Karla' },
  { sala: 'UX', cycle: 'C', name: 'Dr. Edder' },
  { sala: 'UX', cycle: 'D', name: 'Dr. Felipe' },

  { sala: 'Eme', cycle: 'A', name: 'Dr. Manuel' },
  { sala: 'Eme', cycle: 'B', name: 'Dra. Alondra' },
  { sala: 'Eme', cycle: 'C', name: 'Dr. Martin' },
  { sala: 'Eme', cycle: 'D', name: 'Dra. Nely' },

  { sala: 'Área A/Pensionistas', cycle: 'A', name: 'Dra. Katia' },
  { sala: 'Área A/Pensionistas', cycle: 'B', name: 'Dra. Elide' },
  { sala: 'Área A/Pensionistas', cycle: 'C', name: 'Dr. Ángel' },
  { sala: 'Área A/Pensionistas', cycle: 'D', name: 'Dra. Paulina' },
]);

/**
 * @param {AgostoTeamSpec} spec
 */
export function agostoTeamCreatePayload(spec, createdBy) {
  const sala = String(spec.sala || '').trim();
  return {
    name: String(spec.name || '').trim(),
    service: clinicalServiceForSala(sala) || 'Sala',
    subAreaFraction: String(spec.cycle || '').trim().toUpperCase(),
    onCallDayIndex: 0,
    sala,
    teamLeaderName: String(spec.name || '').trim(),
    createdBy: createdBy ? String(createdBy) : undefined,
  };
}

/**
 * Plan idempotent: skip if same sala+name exists; rename if same sala+cycle differs in name.
 *
 * @param {Array<{ team_id?: string, name?: string, sala?: string, sub_area_fraction?: string }>} existingTeams
 * @param {AgostoTeamSpec[]} [catalog]
 */
export function planAgosto2026TeamSeed(existingTeams, catalog = AGOSTO_2026_TEAMS) {
  const active = (existingTeams || []).filter((t) => t && !t.archived_at);
  /** @type {Array<{ action: 'create', spec: AgostoTeamSpec }>} */
  const create = [];
  /** @type {Array<{ action: 'rename', teamId: string, spec: AgostoTeamSpec, fromName: string }>} */
  const rename = [];
  /** @type {Array<{ action: 'skip', spec: AgostoTeamSpec, teamId: string }>} */
  const skip = [];

  for (const spec of catalog) {
    const sala = String(spec.sala || '').trim();
    const name = String(spec.name || '').trim();
    const cycle = String(spec.cycle || '').trim().toUpperCase();
    const byName = active.find(
      (t) => String(t.sala || '').trim() === sala && String(t.name || '').trim() === name
    );
    if (byName) {
      skip.push({ action: 'skip', spec, teamId: String(byName.team_id || '') });
      continue;
    }
    const byCycle = active.find(
      (t) =>
        String(t.sala || '').trim() === sala &&
        String(t.sub_area_fraction || '')
          .trim()
          .toUpperCase() === cycle
    );
    if (byCycle) {
      rename.push({
        action: 'rename',
        teamId: String(byCycle.team_id || ''),
        spec,
        fromName: String(byCycle.name || '').trim(),
      });
      continue;
    }
    create.push({ action: 'create', spec });
  }

  return { create, rename, skip };
}
