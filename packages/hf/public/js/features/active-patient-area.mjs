/**
 * Shared getter for the active patient's área, used to make mode-gated UI
 * (expediente tabs, interconsulta chrome) follow the patient instead of the
 * app-wide Sala/Consulta Externa toggle. Injected via `setActivePatientAreaGetter`
 * at boot (app-runtimes.mjs).
 */
let activePatientAreaGetter = function () {
  return '';
};

export function setActivePatientAreaGetter(fn) {
  if (typeof fn === 'function') activePatientAreaGetter = fn;
}

export function getActivePatientArea() {
  return String(activePatientAreaGetter() || '').trim().toUpperCase();
}

/**
 * True if the active patient's área says "sala", false if it says "consulta
 * externa", or null if área is empty and the caller should fall back to the
 * app's global mode toggle.
 */
export function activePatientModeSala() {
  var area = getActivePatientArea();
  if (!area) return null;
  return area.indexOf('CONSULTA EXTERNA') === -1;
}
