/** Synthetic consult-band inputs for the Preact view tests. */
const teams = [
  { team_id: 't1', name: 'Equipo A', sala: 'Sala 1', sub_area_fraction: '1' },
  { team_id: 't2', name: 'Equipo "B" & co', sala: 'Sala 2', sub_area_fraction: '2' },
];
export const BAND_CASES = {
  empty: { info: { requestingService: '', reason: '', followUpStatus: '', triage: '' } },
  filled: {
    info: { requestingService: 'Cardiología', reason: 'Dolor <torácico> & "disnea"', triage: 'vpo', receivedAt: '2026-01-15T10:05:00.000Z', answeredAt: '2026-01-15T11:30:00.000Z' },
    ctx: { teams, currentTeamId: 't2', groupBySala: false },
  },
  grouped: { info: { requestingService: 'Servicio inexistente', reason: '', triage: 'ic' }, ctx: { teams, currentTeamId: '', groupBySala: true } },
  followUp: { info: { requestingService: 'Cardiología', reason: 'Control', triage: 'seguimiento' }, ctx: { teams: [], currentTeamId: '' } },
};
export const ASSIGN_OPTIONS = [
  { id: 'ic-a', label: 'Interconsultas A' },
  { id: 'ic-b', label: 'B <x> & "y"' },
  ...Array.from({ length: 9 }, (_, i) => ({ id: 'ic-' + i, label: 'Equipo ' + i })),
];
