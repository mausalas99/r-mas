/**
 * Synthetic Pendientes lists (no real patients) shared by the old-vs-new HTML test and the capture
 * that made todos-list-view.old.json. Each scenario is a list of repaints on the same panel.
 * "Now" is fixed and the zone is UTC so the Hoy / Ayer labels do not depend on the run.
 */
export const SCENARIO_NOW = '2026-11-11T15:00:00.000Z';
export const SCENARIO_USER = 'demo';

const base = (id, text, extra) => ({
  id, text, completed: false, priority: 'media', createdBy: 'demo',
  createdAt: '2026-11-10T08:00:00.000Z', updatedAt: '2026-11-10T08:00:00.000Z', ...extra,
});

const T = {
  overdue: base('t-overdue', 'Pedir TAC de craneo simple', { priority: 'alta', dueDate: '2026-11-11T09:00:00.000Z', createdAt: '2026-11-10T09:00:00.000Z' }),
  today: base('t-today', 'Revisar cultivo de orina', { dueDate: '2026-11-11T20:30:00.000Z', reminderAt: '2026-11-11T20:00:00.000Z', createdAt: '2026-11-10T10:00:00.000Z' }),
  soon: base('t-soon', 'Interconsulta a cardiologia', { priority: 'baja', dueDate: '2026-11-13T08:00:00.000Z', createdAt: '2026-11-10T11:00:00.000Z' }),
  later: base('t-later', 'Control de potasio', { dueDate: '2026-11-14T08:00:00.000Z', createdAt: '2026-11-10T12:00:00.000Z' }),
  open: base('t-open', 'Hemocultivos x2', { inProgress: true, triggerValue: 'K 3.1', createdAt: '2026-11-10T13:00:00.000Z' }),
  hand: base('t-hand', 'Seguir gasometria de la noche', { priority: 'alta', createdBy: '@guardia', createdAt: '2026-11-10T14:00:00.000Z' }),
  odd: base('t-odd', 'Revisar <b>"nota"</b> & \'otro\'', { priority: 'baja', createdAt: '2026-11-10T15:00:00.000Z' }),
  doneToday: base('t-done-today', 'Pedir ECO doppler', { completed: true, completedAt: '2026-11-11T12:15:00.000Z', updatedAt: '2026-11-11T12:15:00.000Z' }),
  doneYesterday: base('t-done-ayer', 'Ajustar insulina', { completed: true, completedAt: '2026-11-10T18:40:00.000Z', createdBy: '@guardia' }),
  doneOld: base('t-done-old', 'Retirar sonda', { completed: true, updatedAt: '2026-11-09T07:05:00.000Z' }),
  fresh: base('t-fresh', 'Repetir BH de control', { priority: 'alta', createdAt: '2026-11-11T14:59:00.000Z', updatedAt: '2026-11-11T14:59:00.000Z' }),
};

const mix = [T.overdue, T.today, T.soon, T.later, T.open, T.hand, T.odd, T.doneToday, T.doneYesterday, T.doneOld];
const long = Array.from({ length: 14 }, (_, i) => base('t-long-' + i, 'Pendiente largo ' + (i + 1) + ' con texto un poco mas largo para ver como se acomoda', {
  priority: ['alta', 'media', 'baja'][i % 3],
  dueDate: i % 4 === 0 ? undefined : '2026-11-' + String(11 + (i % 5)).padStart(2, '0') + 'T1' + (i % 10) + ':00:00.000Z',
  completed: i % 5 === 4,
  completedAt: i % 5 === 4 ? '2026-11-11T10:00:00.000Z' : undefined,
  createdAt: '2026-11-10T' + String(8 + (i % 10)).padStart(2, '0') + ':00:00.000Z',
}));
const without = (list, ...ids) => list.filter((t) => !ids.includes(t.id));
const done = (t) => ({ ...t, completed: true, completedAt: '2026-11-11T15:00:00.000Z' });

/** @type {Record<string, Array<{ patient?: string, filter?: string, todos: object[] }>>} */
export const SCENARIOS = {
  empty: [{ todos: [] }],
  emptyHandoff: [{ todos: [T.doneToday], filter: 'handoff' }],
  mixed: [{ todos: mix }],
  handoffFilter: [{ todos: mix, filter: 'handoff' }],
  onlyDone: [{ todos: [T.doneToday, T.doneYesterday, T.doneOld] }],
  long: [{ todos: long }],
  noPatient: [{ patient: '', todos: [] }],
  add: [{ todos: mix }, { todos: [...mix, T.fresh] }],
  deleteMiddle: [{ todos: mix }, { todos: without(mix, 't-soon') }],
  deleteTwo: [{ todos: mix }, { todos: without(mix, 't-overdue', 't-open') }],
  deleteLastOfGroup: [{ todos: mix }, { todos: without(mix, 't-today') }],
  tick: [{ todos: mix }, { todos: mix.map((t) => (t.id === 't-today' ? done(t) : t)) }],
  tickThenDelete: [{ todos: mix }, { todos: mix.map((t) => (t.id === 't-soon' ? done(t) : t)) }, { todos: without(mix, 't-soon') }],
  emptied: [{ todos: [T.overdue, T.today] }, { todos: [] }],
  reorder: [{ todos: mix }, { todos: mix.map((t) => (t.id === 't-later' ? { ...t, priority: 'alta' } : t)) }],
  patientSwitch: [{ todos: mix }, { patient: 'p2', todos: [T.open, T.soon] }],
  filterSwitch: [{ todos: mix }, { todos: mix, filter: 'handoff' }],
};
