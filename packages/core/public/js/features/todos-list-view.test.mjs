process.env.TZ = 'UTC'; // the old markup was captured in UTC; labels like «ayer 18:40» depend on the zone
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import {
  emptyTodoListState, nextTodoListState, endLeaving, patchRow, findRow, openRowsOf, placeLeaving,
} from './todos-list-model.mjs';
import { SCENARIOS, SCENARIO_NOW, SCENARIO_USER } from './todos-list-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { TodoListView } from './todos-list-view.jsx';
  export const html = (state) => renderToString(<TodoListView state={state} h={{}} />);`);

// Exact markup todos-list-render.mjs made before the port (container.innerHTML after each repaint,
// captured from the old code in an Electron window at SCENARIO_NOW, UTC).
const { default: OLD } = await import('./todos-list-view.old.json', { with: { type: 'json' } });

// Preact writes void tags as <x/>, escapes quotes in text and style values with other spacing; HTML parses both the same.
const norm = (s) => s
  // The capture adds the input's value attribute last; the order of attributes does not matter.
  .replace(/( value="[^"]*")( placeholder="[^"]*")/g, '$2$1')
  .replace(/style="([^"]*)"/g, (_m, v) => 'style="' + v.replace(/:\s+/g, ':').replace(/\(0px,/g, '(0,').replace(/;\s*$/, '') + '"')
  .replace(/ style=""/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/ ?\/>/g, '>');

const clone = (x) => JSON.parse(JSON.stringify(x));
const input = (step) => ({
  patientId: step.patient === undefined ? 'p1' : step.patient,
  todos: clone(step.todos),
  filter: step.filter || 'all',
  username: SCENARIO_USER,
  now: new Date(SCENARIO_NOW),
});
const repaint = (state, step) => nextTodoListState(state, input(step));

for (const [name, steps] of Object.entries(SCENARIOS)) {
  test(`Pendientes HTML equals the old builder: ${name}`, () => {
    let state = emptyTodoListState();
    steps.forEach((step, i) => {
      state = repaint(state, step);
      assert.equal(norm(view.html(state)), norm(OLD[name][i]), `step ${i + 1}`);
      state = { ...state, leaving: [] }; // the old rebuild dropped fade-out copies on the next repaint
    });
  });
}

const [mixed] = [SCENARIOS.mixed[0]];
const ids = (state) => openRowsOf(state.model).map((r) => r.id);
const without = (todos, id) => todos.filter((t) => t.id !== id);

test('first paint: every open row enters, closed rows do not, the panel settles as one block', () => {
  const s = repaint(emptyTodoListState(), mixed);
  assert.equal(s.swap, true);
  assert.ok(openRowsOf(s.model).every((r) => r.enter));
  assert.ok(s.model.groups.find((g) => g.status === 'listo').rows.every((r) => !r.enter));
  assert.equal(repaint(s, mixed).swap, false);
});

test('add: only the new row enters, nothing leaves', () => {
  const s1 = repaint(emptyTodoListState(), SCENARIOS.add[0]);
  const s2 = repaint(s1, SCENARIOS.add[1]);
  assert.deepEqual(openRowsOf(s2.model).filter((r) => r.enter).map((r) => r.id), ['t-fresh']);
  assert.equal(s2.leaving.length, 0);
});

test('delete: the row stays drawn as a leaving copy next to its neighbour until the fade ends', () => {
  const s1 = repaint(emptyTodoListState(), mixed);
  const s2 = repaint(s1, { todos: without(mixed.todos, 't-soon') });
  assert.deepEqual(s2.leaving.map((e) => [e.row.id, e.kind]), [['t-soon', 'row-exit']]);
  assert.ok(!ids(s2).includes('t-soon'));
  const body = placeLeaving(s2).groups.find((g) => g.status === 'proximo').items;
  assert.deepEqual(body.map((r) => [r.id, r.leave || null]), [['t-soon', 'row-exit'], ['t-later', null]]);
  assert.equal(endLeaving(s2, 't-soon').leaving.length, 0);
  assert.equal(endLeaving(s2, 'nope'), s2);
});

test('tick: the row leaves the open groups with the success flash and shows under Cerrados', () => {
  const s1 = repaint(emptyTodoListState(), SCENARIOS.tick[0]);
  const s2 = repaint(s1, SCENARIOS.tick[1]);
  assert.deepEqual(s2.leaving.map((e) => [e.row.id, e.kind]), [['t-today', 'row-exit-done']]);
  assert.ok(s2.model.groups.find((g) => g.status === 'listo').rows.some((r) => r.id === 't-today'));
});

test('leaving copies survive a second repaint, drop when the row comes back or the patient changes', () => {
  const s1 = repaint(emptyTodoListState(), mixed);
  const s2 = repaint(s1, { todos: without(mixed.todos, 't-soon') });
  const s3 = repaint(s2, { todos: without(without(mixed.todos, 't-soon'), 't-overdue') });
  assert.deepEqual(s3.leaving.map((e) => e.row.id).sort(), ['t-overdue', 't-soon']);
  assert.equal(repaint(s3, mixed).leaving.length, 0);
  assert.equal(repaint(s3, { patient: 'p2', todos: mixed.todos }).leaving.length, 0);
});

test('leaving copy whose neighbour is gone too is drawn after the last group', () => {
  const s1 = repaint(emptyTodoListState(), SCENARIOS.emptied[0]);
  const s2 = repaint(s1, SCENARIOS.emptied[1]);
  assert.equal(s2.kind, 'empty');
  assert.equal(placeLeaving(s2).tail.length, 2);
  assert.equal(placeLeaving(repaint(s1, { todos: [] })).groups.length, 0);
});

test('priority click changes the row now; the re-sort waits for the next repaint', () => {
  const s1 = repaint(emptyTodoListState(), mixed);
  const s2 = patchRow(s1, 't-later', { priority: 'alta' });
  assert.equal(findRow(s2, 't-later').priority, 'alta');
  assert.deepEqual(ids(s2), ids(s1));
  assert.equal(findRow(s1, 't-later').priority, 'media');
  const sorted = repaint(s2, { todos: mixed.todos.map((t) => (t.id === 't-later' ? { ...t, priority: 'alta' } : t)) });
  assert.equal(findRow(sorted, 't-later').priority, 'alta');
  assert.equal(sorted.leaving.length, 0);
});

test('patient switch: whole panel swaps, no row enter or leave; no patient keeps the last id', () => {
  const s1 = repaint(emptyTodoListState(), mixed);
  const s2 = repaint(s1, SCENARIOS.patientSwitch[1]);
  assert.equal(s2.swap, true);
  assert.ok(openRowsOf(s2.model).every((r) => !r.enter));
  assert.equal(s2.leaving.length, 0);
  const none = nextTodoListState(s2, { ...input({ todos: [] }), patientId: '' });
  assert.equal(none.kind, 'nopatient');
  assert.equal(none.patientId, 'p2');
});
