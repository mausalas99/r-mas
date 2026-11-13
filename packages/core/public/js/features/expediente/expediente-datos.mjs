// Patient demographics pane (Datos tab)
import { getPatients } from '../../app-state.mjs';
import { accesosListProps } from '../../patient-data-accesos-ui.mjs';
import { teamAssignProps, wirePatientTeamAssignRefresh } from '../../patient-team-assign-ui.mjs';
import { ingresoFechasRows } from '../../patient-data-ingreso-ui.mjs';
import { refreshRpcDateFields } from '../../rpc-date-picker.mjs';
import { accesoFechaToDateInputValue } from '../../patient-date-fields.mjs';
import { censoDatosProps } from '../../patient-data-censo-ui.mjs';
import { CLINICAL_SALA_VALUES } from '../../../../lib/clinical-salas.mjs';
import { lazyView } from '../../deferred-work.mjs';
import { rt, aid } from './expediente-runtime.mjs';
import { boxAdvanceOnInput, isBoxReady, isTypedInput } from '../../patient-box-advance.mjs';

const datosView = lazyView(() => import('./expediente-datos-view.jsx'));
const teamView = lazyView(() => import('./expediente-datos-view.jsx'));

/* Board «Datos B»: summary card, then one section at a time behind chips. */
var DATOS_TABS = [
  { id: 'censo', label: 'Censo' },
  { id: 'cama', label: 'Cama e ingreso' },
  { id: 'identidad', label: 'Identidad' },
];
var datosTab = 'censo';

/** Props for the whole pane (see expediente-datos-view.jsx). */
export function datosProps(patient) {
  var active = DATOS_TABS.some(function (t) { return t.id === datosTab; }) ? datosTab : DATOS_TABS[0].id;
  return {
    patient: patient,
    tabs: DATOS_TABS,
    active: active,
    salas: CLINICAL_SALA_VALUES,
    ingreso: ingresoFechasRows(patient, rt.getSettings()),
    accesos: accesosListProps(patient, Date.now()),
    censo: censoDatosProps(patient),
  };
}

function showDatosTab(wrap, id) {
  datosTab = id;
  wrap.querySelectorAll('[data-datos-tab]').forEach(function (b) {
    var on = b.getAttribute('data-datos-tab') === id;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-selected', String(on));
  });
  wrap.querySelectorAll('[data-datos-pane]').forEach(function (el) {
    el.hidden = el.getAttribute('data-datos-pane') !== id;
  });
}

/** Día 1 is the admission day (FIMI, else FIUX). */
function stayDay(patient) {
  var iso = accesoFechaToDateInputValue(patient.fimiFecha) || accesoFechaToDateInputValue(patient.fiuxFecha);
  var start = iso ? new Date(iso + 'T00:00:00') : null;
  if (!start || isNaN(start.getTime())) return null;
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var day = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  if (day < 1) return null;
  return { day: day, since: start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '') };
}

function bedLabel(patient) {
  var cuarto = String(patient.cuarto || '').trim();
  var cama = String(patient.cama || '').trim();
  if (!cama) return cuarto || '—';
  return cuarto + (/^[a-z]$/i.test(cama) ? '' : '-') + cama;
}

function summaryMeta(patient) {
  var bits = [];
  if (patient.edad) bits.push(/^\d+$/.test(String(patient.edad)) ? patient.edad + ' años' : patient.edad);
  if (patient.sexo) bits.push(patient.sexo);
  if (patient.peso) bits.push(patient.peso + ' kg');
  if (patient.talla) bits.push(patient.talla + ' m');
  if (patient.registro) bits.push('Reg. ' + patient.registro);
  return bits.join(' · ');
}

/** Refresh the summary text in place (the Equipo select is left alone). */
function paintDatosSummary(wrap, patient) {
  var set = function (key, text) {
    var el = wrap.querySelector('[data-datos-sum="' + key + '"]');
    if (el) el.textContent = text;
  };
  var stay = stayDay(patient);
  set('bed', bedLabel(patient));
  set('name', String(patient.nombre || '').trim() || 'Sin nombre');
  set('meta', summaryMeta(patient));
  set('day', stay ? 'Día ' + stay.day : 'Sin fecha de ingreso');
  set('since', stay ? 'desde ' + stay.since : 'Agrégala en Cama e ingreso');
  var stayEl = wrap.querySelector('.exp-datos-summary__stay');
  if (stayEl) stayEl.classList.toggle('is-empty', !stay);
}

function patientById(id) {
  return id
    ? getPatients().find(function (p) {
        return String(p.id) === String(id);
      })
    : null;
}

function wireDatosPane(wrap) {
  if (wrap._datosWired) return;
  wrap._datosWired = true;
  // Edits land first (document-capture dispatch); keep the summary in step.
  var sync = function () {
    var patient = patientById(wrap.dataset.patientId);
    if (patient) paintDatosSummary(wrap, patient);
  };
  wrap.addEventListener('input', sync);
  wrap.addEventListener('change', sync);
  // Cuarto → cama, same idle rule as the patient form.
  wrap.addEventListener('input', function (ev) {
    var el = /** @type {HTMLInputElement} */ (ev.target);
    if (!el.classList || !el.classList.contains('exp-datos-q')) return;
    var key = JSON.parse(el.getAttribute('data-oninput-args') || '[]')[0];
    var next = key === 'cuarto' ? wrap.querySelector('[data-oninput-args=\'["cama"]\']') : null;
    boxAdvanceOnInput(el, next, isTypedInput(ev) && isBoxReady({ key: key, value: el.value }), true);
  });
  wrap.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-datos-tab]');
    if (btn && wrap.contains(btn)) showDatosTab(wrap, btn.getAttribute('data-datos-tab'));
  });
}

/** Demographics editable en pestaña Datos (#patient-data-form). */
function renderPatientDataPane(patientIdOverride) {
  var wrap = document.getElementById('patient-data-form');
  if (!wrap) return;
  var targetId =
    patientIdOverride != null && patientIdOverride !== '' ? patientIdOverride : aid();
  var patient = patientById(targetId);
  if (!patient) {
    datosView.use(function (v) { v.drawDatosFields(wrap, null); });
    return;
  }
  // Background sync/team events re-render this pane; rebuilding it under a focused
  // field drops the caret and cuts the typing off. Same patient + focus inside → leave it.
  var focused = document.activeElement;
  if (wrap.dataset.patientId === String(patient.id) && focused && wrap.contains(focused) && wrap.querySelector('.exp-datos-fields')) {
    var slot = wrap.querySelector('#exp-datos-team-slot');
    if (slot && !slot.contains(focused)) teamView.use(function (v) { v.drawTeamAssign(slot, teamAssignProps(patient)); });
    return;
  }
  wrap.dataset.patientId = String(patient.id);
  var datosMount = wrap.closest('.exp-datos-modal-body') || wrap.closest('#exp-datos-modal-mount');
  if (datosMount) datosMount.dataset.patientId = String(patient.id);
  datosView.use(function (v) {
    v.drawDatosFields(wrap, datosProps(patient));
    var teamSlot = wrap.querySelector('#exp-datos-team-slot');
    if (teamSlot) teamView.use(function (t) { t.drawTeamAssign(teamSlot, teamAssignProps(patient)); });
    paintDatosSummary(wrap, patient);
    refreshRpcDateFields(wrap);
    wirePatientTeamAssignRefresh();
    wireDatosPane(wrap);
  });
}

export { renderPatientDataPane };
