/** Synthetic teams (no real people) for panel-admin-equipos-options.test.mjs. */
export const TEAMS = [
  { team_id: 't1', name: 'Equipo <Azul>', sala: 'Sala 1', sub_area_fraction: 'A', service: 'Sala', members: [{}, {}] },
  { team_id: 't2', name: 'Equipo "Rojo"', sala: 'Sala 1', sub_area_fraction: '', service: 'Sala', members: [] },
  { team_id: 't3', name: '', sala: 'Sala 2', sub_area_fraction: 'B', service: 'Sala' },
  { team_id: 't4', name: 'Otro & Co', sala: 'Sede X', sub_area_fraction: 'C', service: 'Sala', members: [{}] },
  { team_id: 't5', name: 'Sin sala', sala: '', sub_area_fraction: '', members: [] },
];
export const TEAM_CASES = [
  { name: 'all', selected: '', sala: '' },
  { name: 'selected', selected: 't3', sala: '' },
  { name: 'sala1', selected: '', sala: 'Sala 1' },
  { name: 'sala1_selected_elsewhere', selected: 't3', sala: 'Sala 1' },
  { name: 'no_teams_in_sala', selected: '', sala: 'UCI' },
];
export const CYCLE_CASES = [
  { name: 'no_team', team: null, userId: 'u1', rank: 'R1', cycle: '' },
  { name: 'r1', team: TEAMS[0], userId: 'u1', rank: 'R1', cycle: '' },
  { name: 'r2_pref', team: TEAMS[0], userId: 'u1', rank: 'R2', cycle: 'B' },
  { name: 'member_cycle', team: { ...TEAMS[0], members: [{ user_id: 'u1', cycle: 'B' }] }, userId: 'u1', rank: 'R1', cycle: '' },
  { name: 'other_service', team: { ...TEAMS[3], service: 'UCI' }, userId: 'u2', rank: 'R3', cycle: '' },
  { name: 'admin', team: TEAMS[1], userId: 'u1', rank: 'Admin', cycle: '' },
];
