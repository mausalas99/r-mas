/** Synthetic inputs (no real people) for panel-admin-more-view.test.mjs. Fixed clock so output is stable. */
export const NOW = Date.parse('2026-11-11T18:00:00Z');
const ago = (ms) => new Date(NOW - ms).toISOString();
const H = 3600e3;
const D = 24 * H;

export const ERROR_MESSAGE = 'No se pudo <cargar> & más';

export const TEAMS = [
  {
    team_id: 't1', name: 'Equipo <Azul>', sala: 'Sala A', service: 'Sala', sub_area_fraction: 'A',
    members: [{ user_id: 'u1', sub_area_fraction: 'A', rank: 'R1' }, { user_id: 'u2', sub_area_fraction: 'B', rank: 'R2' }],
  },
  { team_id: 't2', name: 'Equipo Verde', sala: 'UCI', service: 'UCI', sub_area_fraction: '', members: [] },
  { team_id: 't3', name: '', sala: 'Otra sala', members: [{ user_id: 'u3', rank: 'R3' }] },
];

export const EQUIPOS_ROWS = [
  {
    user_id: 'u1', cloudId: 'c1', username: 'ana.rios', clinical_name: 'Dra. Ana <Ríos>', rank: 'R1', sala: 'Sala A',
    hasLocalProfile: true, last_activity_at: ago(2 * H),
    activity_history: [{ at: ago(2 * H), source: 'R+' }, { at: ago(3 * D), source: 'Nube' }],
  },
  {
    user_id: 'u2', cloudId: '', username: '@solo.clinico', clinical_name: 'Luis Pérez', rank: 'R2', sala: '',
    hasLocalProfile: true, clinicalOnly: true, last_activity_at: ago(40 * D), activity_history: [],
  },
  {
    user_id: '', cloudId: 'c9', username: 'nuevo.user', clinical_name: '', rank: '', sala: 'UCI',
    hasLocalProfile: false, last_activity_at: '', activity_history: null,
  },
  {
    user_id: 'u3', cloudId: 'c3', username: 'sin.equipo', clinical_name: 'Marta Díaz', rank: 'R4', sala: 'Sala Z',
    hasLocalProfile: true, last_activity_at: ago(5 * D),
  },
];

export const SESSIONS = [
  { device_type: 'ecg', holder_name: 'Ana <Ríos>', holder_rotation: 'Sala A', checked_out_at: '2026-11-10T14:30:00Z', returned_at: '2026-11-10T16:45:00Z', duration_seconds: 8100, closed_reason: 'return' },
  { device_type: 'unknown-dev', holder_name: 'Luis', holder_rotation: '', checked_out_at: '2026-11-11T09:00:00Z', returned_at: null, duration_seconds: 90, closed_reason: null },
  { device_type: 'ecg', holder_name: 'Marta', holder_rotation: 'UCI', checked_out_at: '', returned_at: '2026-11-11T10:00:00Z', duration_seconds: 20, closed_reason: 'admin_purge' },
  { device_type: 'ecg', holder_name: 'Otra', holder_rotation: 'UCI', checked_out_at: '2026-11-11T09:00:00Z', returned_at: '2026-11-11T10:00:00Z', duration_seconds: null, closed_reason: 'x' },
];
