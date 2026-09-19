/**
 * Trim a room's full pulled state down to one patient. "Abrir expediente" on
 * the Red tab means look at this one patient's chart — without this, merging
 * the room's raw state (`applyCloudState` in pull-apply.mjs) would adopt
 * every patient in that sala, and every one of their pending todos, into
 * this device's own local storage. That is what made foreign patients'
 * "Pendiente" reminders fire on a device that never had those patients.
 */

function scopeEntries(state, pid) {
  return Array.isArray(state?.entries)
    ? state.entries.filter((e) => String(e?.id || '') === pid)
    : [];
}

function scopeTodos(state, pid) {
  const isOwn = ([, todo]) => todo && String(todo.patientId || '') === pid;
  return Object.fromEntries(Object.entries(state?.todos || {}).filter(isOwn));
}

function scopeAgenda(state, pid) {
  return Array.isArray(state?.agenda)
    ? state.agenda.filter((item) => item && String(item.patientId || '') === pid)
    : state?.agenda;
}

function scopeLabSidecars(state, pid) {
  return state?.labSidecars?.[pid] ? { [pid]: state.labSidecars[pid] } : {};
}

function scopeTombstones(state, pid) {
  const isOwn = ([key]) => key === pid;
  return Object.fromEntries(Object.entries(state?.tombstones || {}).filter(isOwn));
}

/**
 * @param {Record<string, unknown>} state
 * @param {string} patientId
 */
export function scopeCloudStateToPatient(state, patientId) {
  const pid = String(patientId || '').trim();
  return {
    ...state,
    entries: scopeEntries(state, pid),
    todos: scopeTodos(state, pid),
    agenda: scopeAgenda(state, pid),
    labSidecars: scopeLabSidecars(state, pid),
    tombstones: scopeTombstones(state, pid),
  };
}
