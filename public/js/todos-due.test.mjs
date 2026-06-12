import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTodoOverdue,
  todoCompareForDueSort,
  computeReminderAt,
  formatTodoDueLabel,
  parseDuePreset,
  isoToDatetimeLocalValue,
  parseDatetimeLocalToIso,
} from './todos-due.mjs';

const NOW = new Date('2026-06-11T12:00:00.000Z');

function todo(overrides) {
  return {
    id: '1',
    text: 'x',
    completed: false,
    priority: 'media',
    createdAt: '2026-06-11T10:00:00.000Z',
    dueDate: null,
    reminderAt: null,
    ...overrides,
  };
}

test('isTodoOverdue — true when dueDate is before now and not completed', () => {
  assert.equal(
    isTodoOverdue(todo({ dueDate: '2026-06-10T12:00:00.000Z' }), NOW),
    true
  );
});

test('isTodoOverdue — false when dueDate is in the future', () => {
  assert.equal(
    isTodoOverdue(todo({ dueDate: '2026-06-12T12:00:00.000Z' }), NOW),
    false
  );
});

test('isTodoOverdue — false when completed even if past due', () => {
  assert.equal(
    isTodoOverdue(
      todo({ dueDate: '2026-06-10T12:00:00.000Z', completed: true }),
      NOW
    ),
    false
  );
});

test('isTodoOverdue — false when dueDate is missing', () => {
  assert.equal(isTodoOverdue(todo({}), NOW), false);
});

test('computeReminderAt — prefers reminderAt over dueDate', () => {
  assert.equal(
    computeReminderAt(
      todo({
        dueDate: '2026-06-12T08:00:00.000Z',
        reminderAt: '2026-06-12T07:00:00.000Z',
      })
    ),
    '2026-06-12T07:00:00.000Z'
  );
});

test('computeReminderAt — falls back to dueDate when reminderAt is null', () => {
  assert.equal(
    computeReminderAt(todo({ dueDate: '2026-06-12T08:00:00.000Z' })),
    '2026-06-12T08:00:00.000Z'
  );
});

test('computeReminderAt — null when neither field is set', () => {
  assert.equal(computeReminderAt(todo({})), null);
});

test('todoCompareForDueSort — incomplete before completed', () => {
  const open = todo({ id: 'open', completed: false });
  const done = todo({ id: 'done', completed: true });
  assert.ok(todoCompareForDueSort(open, done, NOW) < 0);
  assert.ok(todoCompareForDueSort(done, open, NOW) > 0);
});

test('todoCompareForDueSort — overdue before future due dates', () => {
  const overdue = todo({
    id: 'overdue',
    dueDate: '2026-06-10T08:00:00.000Z',
  });
  const future = todo({
    id: 'future',
    dueDate: '2026-06-12T08:00:00.000Z',
  });
  assert.ok(todoCompareForDueSort(overdue, future, NOW) < 0);
});

test('todoCompareForDueSort — dueDate ascending among non-overdue', () => {
  const sooner = todo({
    id: 'sooner',
    dueDate: '2026-06-11T14:00:00.000Z',
  });
  const later = todo({
    id: 'later',
    dueDate: '2026-06-12T08:00:00.000Z',
  });
  assert.ok(todoCompareForDueSort(sooner, later, NOW) < 0);
});

test('todoCompareForDueSort — todos with dueDate before those without', () => {
  const withDue = todo({
    id: 'with',
    dueDate: '2026-06-12T08:00:00.000Z',
  });
  const withoutDue = todo({ id: 'without', dueDate: null });
  assert.ok(todoCompareForDueSort(withDue, withoutDue, NOW) < 0);
});

test('todoCompareForDueSort — priority alta before media before baja', () => {
  const alta = todo({ id: 'alta', priority: 'alta', dueDate: '2026-06-12T08:00:00.000Z' });
  const media = todo({ id: 'media', priority: 'media', dueDate: '2026-06-12T08:00:00.000Z' });
  const baja = todo({ id: 'baja', priority: 'baja', dueDate: '2026-06-12T08:00:00.000Z' });
  assert.ok(todoCompareForDueSort(alta, media, NOW) < 0);
  assert.ok(todoCompareForDueSort(media, baja, NOW) < 0);
});

test('todoCompareForDueSort — newer createdAt first when tied', () => {
  const older = todo({
    id: 'older',
    dueDate: '2026-06-12T08:00:00.000Z',
    priority: 'media',
    createdAt: '2026-06-10T10:00:00.000Z',
  });
  const newer = todo({
    id: 'newer',
    dueDate: '2026-06-12T08:00:00.000Z',
    priority: 'media',
    createdAt: '2026-06-11T10:00:00.000Z',
  });
  assert.ok(todoCompareForDueSort(newer, older, NOW) < 0);
});

test('todoCompareForDueSort — full sort order snapshot', () => {
  const items = [
    todo({ id: 'completed-overdue', completed: true, dueDate: '2026-06-09T08:00:00.000Z' }),
    todo({ id: 'no-due', dueDate: null, priority: 'alta' }),
    todo({ id: 'future-baja', dueDate: '2026-06-13T08:00:00.000Z', priority: 'baja' }),
    todo({ id: 'overdue-alta', dueDate: '2026-06-09T08:00:00.000Z', priority: 'alta' }),
    todo({ id: 'future-alta', dueDate: '2026-06-12T08:00:00.000Z', priority: 'alta' }),
    todo({ id: 'overdue-media', dueDate: '2026-06-10T08:00:00.000Z', priority: 'media' }),
  ];
  const sorted = items.slice().sort((a, b) => todoCompareForDueSort(a, b, NOW));
  assert.deepEqual(
    sorted.map((t) => t.id),
    [
      'overdue-alta',
      'overdue-media',
      'future-alta',
      'future-baja',
      'no-due',
      'completed-overdue',
    ]
  );
});

test('formatTodoDueLabel — Hoy for same local calendar day', () => {
  const local = new Date(NOW);
  local.setHours(18, 0, 0, 0);
  assert.equal(formatTodoDueLabel(local.toISOString(), NOW), 'Hoy 18:00');
});

test('formatTodoDueLabel — Mañana for next local calendar day', () => {
  const local = new Date(NOW);
  local.setDate(local.getDate() + 1);
  local.setHours(8, 0, 0, 0);
  assert.equal(formatTodoDueLabel(local.toISOString(), NOW), 'Mañana 08:00');
});

test('formatTodoDueLabel — date label for later days', () => {
  assert.equal(
    formatTodoDueLabel('2026-08-15T14:30:00.000Z'),
    formatLaterLabel('2026-08-15T14:30:00.000Z')
  );
});

function formatLaterLabel(iso) {
  const date = new Date(iso);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${date.getDate()} ${months[date.getMonth()]} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

test('parseDuePreset — hoy-18 sets local today at 18:00', () => {
  const ref = new Date('2026-06-11T09:00:00.000Z');
  const expected = new Date(ref);
  expected.setHours(18, 0, 0, 0);
  const result = parseDuePreset('hoy-18', ref);
  assert.equal(result.dueDate, expected.toISOString());
  assert.equal(result.reminderAt, expected.toISOString());
});

test('parseDuePreset — manana-8 sets next local day at 08:00', () => {
  const ref = new Date('2026-06-11T09:00:00.000Z');
  const expected = new Date(ref);
  expected.setDate(expected.getDate() + 1);
  expected.setHours(8, 0, 0, 0);
  const result = parseDuePreset('manana-8', ref);
  assert.equal(result.dueDate, expected.toISOString());
  assert.equal(result.reminderAt, expected.toISOString());
});

test('parseDuePreset — en-3h and en-24h offsets from now', () => {
  const ref = new Date('2026-06-11T12:00:00.000Z');
  const in3h = parseDuePreset('en-3h', ref);
  assert.equal(in3h.dueDate, new Date(ref.getTime() + 3 * 60 * 60 * 1000).toISOString());
  assert.equal(in3h.reminderAt, in3h.dueDate);

  const in24h = parseDuePreset('en-24h', ref);
  assert.equal(in24h.dueDate, new Date(ref.getTime() + 24 * 60 * 60 * 1000).toISOString());
});

test('parseDuePreset — unknown preset returns nulls', () => {
  assert.deepEqual(parseDuePreset('invalid', NOW), {
    dueDate: null,
    reminderAt: null,
  });
});

test('isoToDatetimeLocalValue and parseDatetimeLocalToIso round-trip local fields', () => {
  const ref = new Date(2026, 5, 12, 18, 30, 0, 0);
  const local = isoToDatetimeLocalValue(ref.toISOString());
  assert.match(local, /^2026-06-12T18:30$/);
  const iso = parseDatetimeLocalToIso(local);
  assert.equal(iso, ref.toISOString());
});

test('parseDatetimeLocalToIso — empty or invalid returns null', () => {
  assert.equal(parseDatetimeLocalToIso(''), null);
  assert.equal(parseDatetimeLocalToIso('not-a-date'), null);
});
