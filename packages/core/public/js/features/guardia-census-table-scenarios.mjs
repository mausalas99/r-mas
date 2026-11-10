/** Sample censuses for the guardia census table tests (inputs only; expected HTML lives in the test). */
const past = '2020-01-01T10:00:00.000Z';
const todos = {
  p1: [
    { id: 't1', text: 'Tomar <gas> & "cultivo"', dueDate: past },
    { id: 't2', text: 'Segunda', inProgress: true },
    { id: 't3', text: 'Tercera' },
    { id: 't4', text: 'Hecha', completed: true },
  ],
  p2: [{ id: 't5', text: 'Solo abierta', inProgress: true }],
  p3: [{ id: 't6', text: 'Abierta' }],
};
const full = { cuarto: '2', servicio: 'MI', area: 'A' };
const patients = [
  { id: 'p1', name: 'MARIBEL BENITEZ BAZABE', ...full, cama: '12', censusTeamId: 'tA', isCritical: true,
    entregaMarkers: ['critico', 'show'], guardiaEsfuerzo: 'no', guardiaPronostico: 'bad' },
  { id: 'p2', name: 'Juan "El" <Pérez>', ...full, cama: '3', censusTeamId: 'tA', guardiaEsfuerzo: 'show', guardiaPronostico: 'good',
    entregaMarkers: ['negativas'] },
  { id: 'p3', nombre: 'ANA LOPEZ', cuarto: '9', cama: '1', servicio: 'MI', area: 'A', censusTeamId: 'tB',
    registeredAt: new Date().toISOString() },
  { id: 'p4', bed_label: 'URG-4', censusTeamId: '', interconsult_type: 'Follow-up', interconsult_status: 'Open' },
  { id: 'p5', ...full, cama: '7', censusTeamId: 'tZ', guardiaEsfuerzo: 'full' },
];
const teams = [{ team_id: 'tA', name: 'Equipo A' }, { team_id: 'tB', name: 'Equipo "B"', sala: 'X' }];
export const SCENARIOS = {
  todos: { patients, rank: 'R1', filter: 'todos', collapsed: [] },
  pendiente: { patients, rank: 'R1', filter: 'pendiente', collapsed: [] },
  ingresos: { patients, rank: 'R1', filter: 'ingresos', collapsed: [] },
  r4: { patients, rank: 'R4', filter: 'todos', collapsed: [] },
  collapsed: { patients, rank: 'R1', filter: 'todos', collapsed: ['tA'] },
  one: { patients: [patients[2]], rank: 'R1', filter: 'todos', collapsed: [] },
  none: { patients: [], rank: 'R1', filter: 'todos', collapsed: [] },
};
export const SCENARIO_TODOS = todos;
export const SCENARIO_CTX = { teams, assignments: [], now: '2026-11-10T12:00:00.000Z' };
export const SCENARIO_GUARDIAS = new Map([['p1', { is_critical: 1 }]]);
