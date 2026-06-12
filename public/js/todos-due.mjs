import { normalizeTodoPriority } from './todos-priority.mjs';

var PRIO_ORDER = { alta: 0, media: 1, baja: 2 };

var MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function toDate(value) {
  if (value instanceof Date) return value;
  return new Date(value);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTimeLocal(date) {
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isTomorrowLocal(date, now) {
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameLocalDay(date, tomorrow);
}

function setLocalTime(ref, hours, minutes) {
  var due = new Date(ref);
  due.setHours(hours, minutes, 0, 0);
  return due;
}

function dueTimestamp(todo) {
  if (!todo || !todo.dueDate) return null;
  var due = toDate(todo.dueDate);
  if (Number.isNaN(due.getTime())) return null;
  return due.getTime();
}

function priorityRank(todo) {
  var priority = normalizeTodoPriority(todo && todo.priority);
  return PRIO_ORDER[priority] != null ? PRIO_ORDER[priority] : PRIO_ORDER.media;
}

function compareCreatedAtDesc(a, b) {
  if (a.createdAt && b.createdAt) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  }
  return 0;
}

export function isTodoOverdue(todo, now) {
  if (!todo || todo.completed) return false;
  var dueMs = dueTimestamp(todo);
  if (dueMs == null) return false;
  var ref = now == null ? new Date() : toDate(now);
  return dueMs < ref.getTime();
}

export function todoCompareForDueSort(a, b, now) {
  if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;

  var ref = now == null ? new Date() : toDate(now);
  var aOverdue = isTodoOverdue(a, ref);
  var bOverdue = isTodoOverdue(b, ref);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  var aDue = dueTimestamp(a);
  var bDue = dueTimestamp(b);
  if (aDue != null && bDue != null && aDue !== bDue) return aDue - bDue;
  if (aDue != null && bDue == null) return -1;
  if (aDue == null && bDue != null) return 1;

  var pa = priorityRank(a);
  var pb = priorityRank(b);
  if (pa !== pb) return pa - pb;

  return compareCreatedAtDesc(a, b);
}

export function computeReminderAt(todo) {
  if (!todo) return null;
  if (todo.reminderAt) return String(todo.reminderAt);
  if (todo.dueDate) return String(todo.dueDate);
  return null;
}

export function isoToDatetimeLocalValue(isoStr) {
  var d = toDate(String(isoStr || '').trim());
  if (Number.isNaN(d.getTime())) return '';
  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate()) +
    'T' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  );
}

export function parseDatetimeLocalToIso(value) {
  var raw = String(value || '').trim();
  if (!raw) return null;
  var d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatTodoDueLabel(iso, now) {
  if (!iso) return '';
  var date = toDate(iso);
  if (Number.isNaN(date.getTime())) return '';
  var ref = now == null ? new Date() : toDate(now);
  var time = formatTimeLocal(date);
  if (isSameLocalDay(date, ref)) return 'Hoy ' + time;
  if (isTomorrowLocal(date, ref)) return 'Mañana ' + time;
  return date.getDate() + ' ' + MONTHS_ES[date.getMonth()] + ' ' + time;
}

export function parseDuePreset(presetId, now) {
  var ref = now == null ? new Date() : toDate(now);
  var due = null;

  if (presetId === 'hoy-18') {
    due = setLocalTime(ref, 18, 0);
  } else if (presetId === 'manana-8') {
    var tomorrow = new Date(ref);
    tomorrow.setDate(tomorrow.getDate() + 1);
    due = setLocalTime(tomorrow, 8, 0);
  } else if (presetId === 'en-3h') {
    due = new Date(ref.getTime() + 3 * 60 * 60 * 1000);
  } else if (presetId === 'en-24h') {
    due = new Date(ref.getTime() + 24 * 60 * 60 * 1000);
  }

  if (!due) return { dueDate: null, reminderAt: null };
  var iso = due.toISOString();
  return { dueDate: iso, reminderAt: iso };
}
