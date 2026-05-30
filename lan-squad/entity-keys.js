'use strict';

function agendaEntityKey(eventId) {
  return 'agenda:' + String(eventId || '');
}

function todoEntityKey(patientId, todoId) {
  return 'todo:' + String(patientId || '') + ':' + String(todoId || '');
}

function parseEntityKey(key) {
  if (key.startsWith('agenda:')) return { entityType: 'agenda', entityId: key.slice(7) };
  if (key.startsWith('todo:')) {
    const rest = key.slice(5).split(':');
    return { entityType: 'todo', patientId: rest[0], entityId: rest[1] };
  }
  return null;
}

module.exports = { agendaEntityKey, todoEntityKey, parseEntityKey };
