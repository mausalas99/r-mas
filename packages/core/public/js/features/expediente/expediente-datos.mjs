// Patient demographics pane (Datos tab)
import { getPatients } from '../../app-state.mjs';
import { isModeSala } from '../../mode-features.mjs';
import { buildPatientAccesosSectionHtml } from '../../patient-data-accesos-ui.mjs';
import { buildPatientTeamAssignSectionHtml, wirePatientTeamAssignRefresh } from '../../patient-team-assign-ui.mjs';
import { buildPatientSalaFieldHtml } from '../../patient-sala-ui.mjs';
import { buildPatientIngresoFechasHtml } from '../../patient-data-ingreso-ui.mjs';
import { refreshRpcDateFields } from '../../rpc-date-picker.mjs';
import { buildPatientCensoDatosSectionsHtml } from '../../patient-data-censo-ui.mjs';
import { rt, aid, esc } from './expediente-runtime.mjs';

var UPPER = ' style="text-transform:uppercase;"';

/** Quiet text input: looks like plain text until hover or focus. */
function qInput(key, value, extra) {
  return (
    '<input type="text" class="exp-datos-q" value="' + esc(value || '') +
    '" data-oninput="updatePatient" data-oninput-args=\'["' + key + '"]\' data-oninput-pass="value"' + (extra || '') + '>'
  );
}

/** One property line: muted label left, value right. The <label> wraps its control. */
function propHtml(label, control, title) {
  return (
    '<label class="exp-datos-prop"' + (title ? ' title="' + esc(title) + '"' : '') + '>' +
    '<span class="exp-datos-prop__k">' + esc(label) + '</span>' + control + '</label>'
  );
}

/** Two values on one line; each keeps its own (visually hidden) label. */
function pairHtml(label, items) {
  return (
    '<div class="exp-datos-prop"><span class="exp-datos-prop__k" aria-hidden="true">' + esc(label) + '</span><div class="exp-datos-pair">' +
    items
      .map(function (it) {
        return (
          '<label class="exp-datos-unit"><span class="visually-hidden">' + it[0] + '</span>' + it[1] +
          (it[2] ? '<small>' + it[2] + '</small>' : '') + '</label>'
        );
      })
      .join('') +
    '</div></div>'
  );
}

/** Titled group; `action` sits on the title line. */
function sectionHtml(title, body, action) {
  return (
    '<section class="exp-datos-sec"><div class="exp-datos-sec__head"><h4 class="exp-datos-sec__title">' + title + '</h4>' +
    (action || '') + '</div>' + body + '</section>'
  );
}

function buildPatientDemographicsFieldsHtml(patient, teamInHeader) {
  var sexo =
    '<select class="exp-datos-q" data-onchange="updatePatient" data-onchange-args=\'["sexo"]\' data-onchange-pass="value">' +
    '<option value="M"' + (patient.sexo === 'M' ? ' selected' : '') + '>M</option>' +
    '<option value="F"' + (patient.sexo === 'F' ? ' selected' : '') + '>F</option></select>';
  var props =
    sectionHtml('Identidad',
      propHtml('Nombre', qInput('nombre', patient.nombre, UPPER)) +
      propHtml('Registro', qInput('registro', patient.registro)) +
      pairHtml('Edad · Sexo', [['Edad', qInput('edad', patient.edad, ' inputmode="numeric"')], ['Sexo', sexo]]) +
      pairHtml('Peso · Talla', [
        ['Peso', qInput('peso', patient.peso, ' inputmode="decimal" placeholder="—"'), 'kg'],
        ['Talla', qInput('talla', patient.talla, ' inputmode="decimal" placeholder="—"'), 'm'],
      ])) +
    sectionHtml('Cama',
      pairHtml('Cuarto · Cama', [['Cuarto', qInput('cuarto', patient.cuarto)], ['Cama', qInput('cama', patient.cama)]]) +
      propHtml('Sala', buildPatientSalaFieldHtml(patient)) +
      propHtml('Servicio', qInput('servicio', patient.servicio, UPPER)) +
      propHtml('Área', qInput('area', patient.area, UPPER))) +
    sectionHtml('Ingreso',
      buildPatientIngresoFechasHtml(patient, rt.getSettings(), propHtml) + buildPatientAccesosSectionHtml(patient),
      '<button type="button" class="exp-datos-sec__action" data-onclick="addPatientAccesoRow">+ Acceso</button>') +
    (teamInHeader ? '' : sectionHtml('Equipo', buildPatientTeamAssignSectionHtml(patient)));
  var censo = isModeSala(rt.getSettings()) ? buildPatientCensoDatosSectionsHtml(patient, sectionHtml) : '';
  return (
    '<div class="exp-datos-col exp-datos-col--props">' + props + '</div>' +
    (censo ? '<div class="exp-datos-col exp-datos-col--censo">' + censo + '</div>' : '')
  );
}

/** @param {Record<string, unknown>} patient @param {{ embedded?: boolean, teamInHeader?: boolean }} [opts] */
function buildPatientDemographicsCardHtml(patient, opts) {
  var fields = buildPatientDemographicsFieldsHtml(patient, opts && opts.teamInHeader);
  if (opts && opts.embedded) {
    return '<div class="exp-datos-fields">' + fields + '</div>';
  }
  return (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body">' +
    fields +
    '</div></div>'
  );
}

/** Modal title shows who is open; the form below holds the rest. */
function renderDatosModalHeader(patient) {
  var title = document.getElementById('exp-datos-modal-title');
  if (title) title.textContent = (patient && String(patient.nombre || '').trim()) || 'Datos del paciente';
}

function patientById(id) {
  return id
    ? getPatients().find(function (p) {
        return String(p.id) === String(id);
      })
    : null;
}

/** Demographics editable en pestaña Datos (#patient-data-form). */
function renderPatientDataPane(patientIdOverride) {
  var wrap = document.getElementById('patient-data-form');
  if (!wrap) return;
  var targetId =
    patientIdOverride != null && patientIdOverride !== '' ? patientIdOverride : aid();
  var patient = patientById(targetId);
  // In the modal, name and Equipo live in the header, not in the form.
  var inModal = !!wrap.closest('#exp-datos-modal-mount');
  var teamSlot = inModal ? document.getElementById('exp-datos-team-slot') : null;
  if (teamSlot) teamSlot.innerHTML = patient ? buildPatientTeamAssignSectionHtml(patient) : '';
  if (inModal) renderDatosModalHeader(patient);
  if (!patient) {
    wrap.innerHTML = '';
    return;
  }
  wrap.dataset.patientId = String(patient.id);
  var datosMount = wrap.closest('.exp-datos-modal-body') || wrap.closest('#exp-datos-modal-mount');
  if (datosMount) datosMount.dataset.patientId = String(patient.id);
  wrap.innerHTML = buildPatientDemographicsCardHtml(patient, { embedded: true, teamInHeader: !!teamSlot });
  refreshRpcDateFields(wrap);
  wirePatientTeamAssignRefresh();
  // Edits land first (document-capture dispatch); keep the banner in step.
  if (!wrap._datosHeaderWired) {
    wrap._datosHeaderWired = true;
    var sync = function () {
      if (wrap.closest('#exp-datos-modal-mount')) renderDatosModalHeader(patientById(wrap.dataset.patientId));
    };
    wrap.addEventListener('input', sync);
    wrap.addEventListener('change', sync);
  }
}

export { buildPatientDemographicsCardHtml, renderPatientDataPane };
