/** R+ HF feature gates — LAN/Nube sync UI and rotation/team UI stay off; cardio Salida stays mostly intact. */
import { isModeSala } from '../../mode-features.mjs';
import { isGuardiaMode } from '../chrome.mjs';
import { settingsRef } from '../profile-runtime.mjs';
import { activePatientModeSala } from '../active-patient-area.mjs';

/**
 * True when the app should show the 10b interconsulta (Consulta Externa)
 * frame for the active patient (not Guardia). Moved here from
 * interconsulta-mode-chrome.mjs (still re-exported there for back-compat)
 * so light callers like medications-panel-render.mjs can import the check
 * without pulling in that module's heavier eager chrome-building imports
 * (consult-band.mjs, expediente-navigation.mjs) — see BN-12 eager-payload
 * budget in public/js/app-boot-imports.test.mjs.
 */
export function isInterconsultaModeActive() {
  if (isGuardiaMode()) return false;
  var perPatient = activePatientModeSala();
  return perPatient === null ? !isModeSala(settingsRef()) : !perPatient;
}

export function hospitalizacionModeLabel() {
  return 'Hospitalización';
}

export function consultaExternaModeLabel() {
  return 'Consulta Externa';
}

/**
 * Drop VPO (Med-Interna preop clearance), Listado de problemas, and Receta HU
 * — none apply to the cardiology HF workflow. Salida instead carries the
 * cardio-only "Hoja IC" docx export (`hojaIC`).
 */
export function filterSalidaSectionsForHf(sections) {
  var kept = (sections || []).filter((s) => s !== 'vpo' && s !== 'listado' && s !== 'recetaHu');
  return kept.concat('hojaIC');
}

export function hfProductName() {
  return 'R+ HF';
}
