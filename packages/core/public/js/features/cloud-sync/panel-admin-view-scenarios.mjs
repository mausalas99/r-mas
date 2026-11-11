/** Synthetic inputs (no real patients) for panel-admin-view.test.mjs. Fixed clock so output is stable. */
export const NOW = Date.parse('2026-11-11T18:00:00Z');
const MB = 1024 * 1024;
const ago = (ms) => new Date(NOW - ms).toISOString();
const H = 3600e3;
const D = 24 * H;

export const RESUMEN = {
  full: {
    counts: { rooms: 3, users: 12, members: 20, storageBytes: 7.5 * MB },
    meters: { maxMembersPerRoom: 25, storageSoftBytes: 50 * MB, storageHardBytes: 100 * MB },
  },
  bare: { counts: { members: 1 }, meters: {} },
};

export const EXTRAS = {
  full: {
    rooms: [
      { sala: 'Sala A', storageBytes: 3 * MB },
      { sala: 'Sala <B> & C', storageBytes: 500 },
      { storageBytes: 2 * MB },
    ],
    patients: [
      { sala: 'Sala A', nombre: '(sin nombre)' },
      { sala: 'Sala A', nombre: '(sin nombre)' },
      { sala: 'Sala B', nombre: '(sin nombre)' },
      { sala: 'Sala A', nombre: 'Paciente Uno', staleLabs: true, archived: false },
      { sala: 'Sala A', nombre: 'Paciente Dos', staleLabs: true, archived: true },
    ],
  },
  single: { rooms: [], patients: [{ sala: 'Sala A', nombre: '(sin nombre)' }, { sala: 'Sala A', nombre: 'X', staleLabs: true }] },
  none: { rooms: [], patients: null },
};

export const SALAS = {
  rooms: [
    { id: 'r1', code: 'ABC123', sala: 'Sala A', turnKey: '2026-11', storageBytes: 3 * MB, memberCount: 4, revision: 12 },
    { id: 'r2', code: 'XYZ"789', sala: 'Sala <B> & C', turnKey: '2026-11', storageBytes: 2048, memberCount: 1, revision: 0 },
    { id: 'r3', sala: '', turnKey: '2026-10', storageBytes: 0 },
  ],
  mine: 'r2',
  oneMonth: [{ id: 'r9', code: 'Q', sala: 'Sala Z', turnKey: '2026-11', storageBytes: 10, memberCount: 2, revision: 3 }],
};

export const ROOM_DETAIL = {
  room: { id: 'r1', code: 'ABC123', sala: 'Sala A', turnKey: '2026-11', revision: 12, storageBytes: 3 * MB, memberCount: 2 },
  members: [
    { username: 'ana', displayName: 'Ana <Prueba>', role: 'admin', joinedAt: '2026-11-01' },
    { username: '', displayName: '', role: 'otro', joinedAt: '' },
  ],
  none: { room: { id: 'r5' }, members: [] },
};

const TEAMS = [{ team_id: 't1', name: 'Equipo Azul' }, { team_id: 't2', name: 'Equipo & Verde' }];
const assign = (p, t) => ({ patient_id: p, team_id: t, effective_at: '2026-01-01T00:00:00Z' });
export const CENSUS_USERS = [
  { user_id: 'u1', clinical_name: 'Dra. Ana Prueba', username: 'ana' },
  { user_id: 'u2', username: 'beto' },
];
export const CENSUS = [
  {
    sala: 'Sala A', roomId: 'r1', code: 'ABC123',
    entries: [
      { id: 'p1', fields: { registro: '111', nombre: 'Paciente Uno', cama: '2', cuarto: '10', servicio: 'MI' } },
      { id: 'p2', fields: { registro: '222', nombre: 'Paciente <Dos>', cama: '10' } },
      { id: 'p3', fields: { registro: '333', cama: '1', archived: true } },
      { id: 'p4', fields: { registro: '444', nombre: 'Paciente Cuatro', cama: '3' } },
      { id: 'p5', fields: { registro: '555', nombre: 'Paciente Cinco', cama: '4' } },
    ],
    clinicalOps: {
      teams: TEAMS,
      patient_team_assignment: [assign('p1', 't1'), assign('p2', 't2'), assign('p4', 't1')],
      team_membership: [{ team_id: 't1', user_id: 'u1' }, { team_id: 't2', user_id: 'u2' }],
    },
    entityVersions: {
      'entries/p1/note': { updatedAt: ago(3 * H), actorId: 'u1' },
      'labSidecars/p1/s1': { updatedAt: ago(2 * D), actorId: 'u1' },
      'entries/p2/monitoreo': { updatedAt: ago(2 * D), actorId: 'u2' },
      'labSidecars/p2/s1': { updatedAt: ago(9 * D), actorId: 'u2' },
      'entries/p4/vpo': { updatedAt: ago(10 * D), actorId: 'u1' },
      'entries/p5/note': { updatedAt: ago(30 * 1000), actorId: 'zz' },
    },
  },
  { sala: 'Sala B', roomId: 'r2', code: 'XYZ789', entries: [], clinicalOps: null, entityVersions: null },
  { sala: 'Sala C', error: 'Sin sala activa este mes.' },
  { sala: 'Sala D', error: 'Sin sala activa este mes' },
  { sala: 'Sala E', error: '' },
];
export const CENSUS_ONE_UNNAMED = [
  { sala: 'Sala A', roomId: 'r1', code: 'A', entries: [{ id: 'p3', fields: { registro: '9' } }], clinicalOps: null, entityVersions: null },
];
export const CENSUS_EMPTY = [{ sala: 'Sala B', roomId: 'r2', code: 'B', entries: [] }];

export const MUTATIONS = [
  { createdAt: ago(10 * 60e3), revision: 5, totalBytes: 2048, maxOpPath: 'entries/p1/medReceta', opCount: 3, clientMutationId: 'dev-1', actorId: 'u1', opsJson: '{"a":1}', opsJsonTruncated: true, paths: [] },
  { createdAt: ago(20 * 60e3), revision: 4, totalBytes: 500, maxOpPath: 'labSidecars/p1/s1', opCount: 1, clientMutationId: 'dev-2', actorId: 'u2', opsJson: '{"b":"<x>"}', paths: [] },
  { createdAt: ago(5 * H), revision: 3, totalBytes: 'n/a', maxOpPath: '', opCount: 2, actorId: 'nobody', opsJson: '', paths: ['entries/p9/note'] },
  { createdAt: ago(3 * D), revision: 2, totalBytes: 9000, maxOpPath: 'delete/x', opCount: 1, clientMutationId: 'dev-3', actorId: 'u1', opsJson: '{}' },
  { createdAt: 'no-date', totalBytes: 1, actorId: 'u1' },
];
export const MUTATIONS_ONE = [MUTATIONS[0]];
