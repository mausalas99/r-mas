/** Synthetic teams and users for the scope filters bar tests (inputs only). */
export const TEAMS = [
  { team_id: 't2', name: 'Equipo "B" & co', sala: 'Sala X', sub_area_fraction: '2' },
  { team_id: 't1', name: 'Equipo A', sala: 'Sala X', sub_area_fraction: '1' },
  { team_id: 't3', service: 'Cardio <MI>', sala: '', sub_area_fraction: '' },
  { team_id: 't4', name: 'Zeta', sala: 'Sala Y' },
  { team_id: '', name: '' },
];
export const TEAM_OPTION_CASES = {
  flat: { teams: TEAMS, selected: 't1', opts: {} },
  flatNoSel: { teams: TEAMS, selected: '', opts: {} },
  grouped: { teams: TEAMS, selected: 't4', opts: { groupBySala: true } },
  empty: { teams: [], selected: '', opts: { groupBySala: true } },
};
export const BODY_CASES = {
  withSala: { showSala: true },
  noSala: { showSala: false },
};
