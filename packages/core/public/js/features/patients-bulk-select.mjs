/**
 * Sidebar multi-select state for bulk patient delete.
 */

var _mode = false;
/** @type {Set<string>} */
var _selected = new Set();

export function isPatientBulkSelectMode() {
  return _mode;
}

export function getPatientBulkSelectedIds() {
  return Array.from(_selected);
}

export function getPatientBulkSelectedCount() {
  return _selected.size;
}

export function isPatientBulkSelected(patientId) {
  return _selected.has(String(patientId || '').trim());
}

export function setPatientBulkSelectMode(on) {
  _mode = !!on;
  if (!_mode) _selected.clear();
}

export function togglePatientBulkSelectMode() {
  setPatientBulkSelectMode(!_mode);
  return _mode;
}

export function togglePatientBulkSelected(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) return false;
  if (_selected.has(pid)) _selected.delete(pid);
  else _selected.add(pid);
  return _selected.has(pid);
}

export function clearPatientBulkSelection() {
  _selected.clear();
}

export function exitPatientBulkSelectMode() {
  setPatientBulkSelectMode(false);
}
