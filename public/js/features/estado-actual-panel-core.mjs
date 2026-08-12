/** EA panel cache + active patient lookup. */
import { getPatients } from '../app-state.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';

export var _eaPanelCache = { shellKey: '', dataKey: '' };

export function invalidateEaPanelCache() {
  _eaPanelCache.shellKey = '';
  _eaPanelCache.dataKey = '';
}

export function findActivePatient() {
  var activeId = getEaPanelRuntime().getActiveId();
  if (!activeId) return null;
  return (
    getPatients().find(function (p) {
      return String(p.id) === String(activeId);
    }) || null
  );
}
