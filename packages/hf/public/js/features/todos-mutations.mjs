/** Pendientes — CRUD + LAN sync. */
import { storage } from '../storage.js';
import { enqueueCloudTodoDelete, enqueueCloudTodoUpsert } from './cloud-sync/mutate-bridge.mjs';
import { normalizeTodoPriority } from '../todos-priority.mjs';
import { rescheduleAllTodos } from '../todos-reminder-scheduler.mjs';
import {
  isHandoffTodo,
  buildHandoffAckPatch,
} from '../todos-handoff.mjs';
import { aid, getClinicalUsername } from './todos-runtime.mjs';
import { refreshAllTodoUIs } from './todos-refresh.mjs';

/**
 * Creates and persists a pendiente for the active patient from plain field
 * values (no DOM reads) — shared by the inline add-row (`addTodo`) and the
 * kit-styled "Nuevo pendiente" modal (`todos-add-modal.mjs`).
 * @param {{ text: string, priority?: string, dueFields?: { dueDate?: string, reminderAt?: string } }} fields
 * @returns {boolean} whether a pendiente was created
 */
export function addTodoWithFields(fields) {
  if (!aid()) return false;
  var text = String((fields && fields.text) || '').trim();
  if (!text) return false;
  var priority = normalizeTodoPriority((fields && fields.priority) || 'media');
  var nowIso = new Date().toISOString();
  var todos = storage.getTodos(aid());
  var row = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
    text: text,
    completed: false,
    priority: priority,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  var username = getClinicalUsername();
  if (username) row.createdBy = username;
  var dueFields = fields && fields.dueFields;
  if (dueFields && dueFields.dueDate) {
    row.dueDate = dueFields.dueDate;
    if (dueFields.reminderAt) row.reminderAt = dueFields.reminderAt;
  }
  todos.push(row);
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), row);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
  return true;
}

export function addTodo(idPrefix, priorityOverride, dueFields) {
  if (idPrefix === undefined || idPrefix === null) idPrefix = '';
  if (typeof idPrefix !== 'string') idPrefix = '';
  var input = document.getElementById(idPrefix + 'todo-input');
  if (!input) return;
  var chip = document.getElementById(idPrefix + 'todo-priority-chip');
  var priority = priorityOverride || (chip && chip.dataset.priority) || 'media';
  var ok = addTodoWithFields({ text: input.value, priority: priority, dueFields: dueFields });
  if (ok) input.value = '';
}

export function toggleTodo(id) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  var nowIso = new Date().toISOString();
  var username = getClinicalUsername();
  found.completed = !found.completed;
  if (found.completed) {
    found.completedAt = nowIso;
    if (username) found.completedBy = username;
    found.inProgress = false;
  } else {
    found.completedAt = null;
    found.completedBy = null;
  }
  found.updatedAt = nowIso;
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}

export function deleteTodo(id) {
  if (!aid()) return;
  var delAt = new Date().toISOString();
  var todos = storage.getTodos(aid());
  var victim = todos.find(function (t) {
    return t.id === id;
  });
  todos = todos.filter(function (t) {
    return t.id !== id;
  });
  storage.saveTodos(aid(), todos);
  // Always pass a fresh delete clock — reusing victim.updatedAt makes Nube LWW
  // reject the op as stale (same updatedAt as the prior upsert).
  enqueueCloudTodoDelete(aid(), victim || { id: id }, delAt);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}

export function setTodoPriority(id, priority, opts) {
  if (!aid()) return;
  opts = opts || {};
  var valid = normalizeTodoPriority(priority);
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.priority = valid;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  if (opts.deferResortMs) {
    setTimeout(refreshAllTodoUIs, opts.deferResortMs);
    return;
  }
  refreshAllTodoUIs();
}

/**
 * Toggles the "En curso" (in-progress) flag on a pendiente (decision D3b) —
 * shows as the EN CURSO status in the Guardia census table
 * (`guardiaPatientStatus`, `guardia-census-table.mjs`). Cleared automatically
 * when the pendiente is marked resolved (`toggleTodo` sets `completed`).
 * @param {string} id
 */
export function setTodoInProgress(id, inProgress) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.inProgress = !!inProgress;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  refreshAllTodoUIs();
}

export function acknowledgeHandoffTodo(id) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) {
    return t.id === id;
  });
  if (!found || !isHandoffTodo(found, getClinicalUsername())) return;
  Object.assign(found, buildHandoffAckPatch(getClinicalUsername()));
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}

export function updateTodoText(id, text) {
  if (!aid()) return;
  var trimmed = String(text || '').trim();
  if (!trimmed) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found || String(found.text || '') === trimmed) return;
  found.text = trimmed;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}

/**
 * Marca como completados pendientes legacy de reposición electrolítica (Manejo automático).
 * @param {string} patientId
 */
export function archiveLegacyRepoTodos(patientId) {
  if (!patientId) return;
  var todos = storage.getTodos(patientId).map(function (t) {
    if (!t || t.completed) return t;
    var rid = String(t.labRuleId || '');
    var txt = String(t.text || '');
    if (rid.indexOf('manejo:') === 0 || /^Repo /i.test(txt)) {
      return { ...t, completed: true, updatedAt: new Date().toISOString() };
    }
    return t;
  });
  storage.saveTodos(patientId, todos);
}
