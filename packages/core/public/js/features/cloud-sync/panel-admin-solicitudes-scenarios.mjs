/** Synthetic inputs (no real people) for panel-admin-solicitudes-view.test.mjs. */
export const PENDING = [
  { id: 'q1', username: 'ana', displayName: 'Ana <Prueba>', requestedSala: 'Sala 2', createdAt: '2026-11-10T15:30:00Z' },
  { id: 'q"2', username: 'beto', displayName: '', requestedSala: 'Área A/Pensionistas', createdAt: '2026-11-11T09:05:00Z' },
  { id: 'q3', username: 'cy&d', requestedSala: 'Otra', createdAt: '2026-11-09T22:00:00Z' },
];
export const RESOLVED = [
  { id: 'q4', username: 'dani', displayName: 'Dani', requestedSala: 'UCI', status: 'approved', assignedSala: 'Sala 1', createdAt: '2026-11-08T10:00:00Z' },
  { id: 'q5', username: 'eli', displayName: 'Eli', requestedSala: 'Eme', status: 'rejected', createdAt: '2026-11-07T10:00:00Z' },
  { id: 'q6', username: 'fer', displayName: 'Fer', requestedSala: 'UX', status: 'approved', createdAt: '2026-11-06T10:00:00Z' },
];
export const ERROR_MESSAGE = 'Sin <conexión> & "red"';
