'use strict';

function agendaEntityKey(id) {
  return 'a:' + String(id || '');
}

function todoEntityKey(patientId, id) {
  return 't:' + String(patientId || '') + ':' + String(id || '');
}

function historiaClinicaEntityKey(patientId) {
  return 'hc:' + String(patientId || '');
}

function collectKeysFromBundlePayload(payload) {
  const keys = new Set();
  if (!payload || typeof payload !== 'object') return keys;
  const agenda = Array.isArray(payload.agenda) ? payload.agenda : [];
  for (const ev of agenda) {
    if (ev && ev.id) keys.add(agendaEntityKey(ev.id));
  }
  const todos = payload.todos && typeof payload.todos === 'object' ? payload.todos : {};
  for (const pid of Object.keys(todos)) {
    const arr = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (const t of arr) {
      if (t && t.id) keys.add(todoEntityKey(pid, t.id));
    }
  }
  if (payload.manejo && typeof payload.manejo === 'object') keys.add('manejo');
  if (payload.clinicalOps && typeof payload.clinicalOps === 'object') keys.add('clinicalOps');
  return keys;
}

module.exports = {
  agendaEntityKey,
  todoEntityKey,
  historiaClinicaEntityKey,
  collectKeysFromBundlePayload,
};
