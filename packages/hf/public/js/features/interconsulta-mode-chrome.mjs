/**
 * Interconsulta mode chrome (design handoff screen 10b).
 *
 * No standalone top bar any more — the old "CONSULTA EXTERNA" title strip
 * with the "…" menu, "⌘/" shortcut, and "Actualizar pacientes" button was a
 * leftover from the IM interconsultas panel this was forked from and added
 * nothing outpatient cardiology needs. This file now only paints the HF
 * follow-up band (Fase de seguimiento / Último internamiento / Última
 * consulta / Abrir consulta de hoy) into the placeholder dashboard-html.mjs
 * renders inline on the patient's name row (#interconsulta-consult-band,
 * only present in the DOM when Consulta Externa mode is active) — see
 * dashboard-mount.mjs, which calls syncInterconsultaModeChrome() right
 * after every Resumen render.
 */
import { getPatients } from '../app-state.mjs';
import { isInterconsultaModeActive } from './cardio/rplushf-gates.mjs';
import { switchInnerTab } from './expediente-navigation.mjs';
import {
  buildHfFollowUpBandModel,
  renderHfFollowUpBandHtml,
  wireHfFollowUpBand,
} from './patient-dashboard/consult-band.mjs';

var rt = {
  getActiveId() {
    return null;
  },
};

export function registerInterconsultaChromeRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

/** True when the app should show the 10b interconsulta frame (not Guardia).
 * Re-exported for back-compat — moved to cardio/rplushf-gates.mjs (leaf
 * module) so light callers can import it without this module's heavier
 * eager chrome-building imports. */
export { isInterconsultaModeActive };

function activeInterconsultaPatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return (
    getPatients().find(function (p) {
      return String(p.id) === String(id);
    }) || null
  );
}

/** Repaints the HF follow-up band for whichever patient is active. No-op when absent/hidden. */
export function renderConsultBandForActivePatient() {
  var bandMount = document.getElementById('interconsulta-consult-band');
  if (!bandMount || bandMount.hidden) return;
  var patient = activeInterconsultaPatient();
  if (!patient) {
    bandMount.innerHTML = '';
    return;
  }
  bandMount.innerHTML = renderHfFollowUpBandHtml(buildHfFollowUpBandModel(patient));
  wireHfFollowUpBand(bandMount, patient, {
    onChange: renderConsultBandForActivePatient,
    onOpenConsultaHoy: function () {
      switchInnerTab('consultaIC', { forceRender: true });
    },
  });
}

/** Paints the follow-up band when active. Call on any mode or patient change. */
export function syncInterconsultaModeChrome() {
  if (!isInterconsultaModeActive()) return;
  renderConsultBandForActivePatient();
}
