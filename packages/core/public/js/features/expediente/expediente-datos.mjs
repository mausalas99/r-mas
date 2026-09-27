// Patient demographics pane (Datos tab)
import { getPatients } from '../../app-state.mjs';
import { isModeSala } from '../../mode-features.mjs';
import { buildPatientAccesosSectionHtml } from '../../patient-data-accesos-ui.mjs';
import { buildPatientTeamAssignSectionHtml, wirePatientTeamAssignRefresh } from '../../patient-team-assign-ui.mjs';
import { buildPatientSalaFieldHtml } from '../../patient-sala-ui.mjs';
import { buildPatientIngresoFechasHtml } from '../../patient-data-ingreso-ui.mjs';
import { refreshRpcDateFields } from '../../rpc-date-picker.mjs';
import { accesoFechaToDateInputValue } from '../../patient-date-fields.mjs';
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

function identidadHtml(patient) {
  var sexo =
    '<select class="exp-datos-q" data-onchange="updatePatient" data-onchange-args=\'["sexo"]\' data-onchange-pass="value">' +
    '<option value="M"' + (patient.sexo === 'M' ? ' selected' : '') + '>M</option>' +
    '<option value="F"' + (patient.sexo === 'F' ? ' selected' : '') + '>F</option></select>';
  return sectionHtml('Identidad',
    propHtml('Nombre', qInput('nombre', patient.nombre, UPPER)) +
    propHtml('Registro', qInput('registro', patient.registro)) +
    pairHtml('Edad · Sexo', [['Edad', qInput('edad', patient.edad, ' inputmode="numeric"')], ['Sexo', sexo]]) +
    pairHtml('Peso · Talla', [
      ['Peso', qInput('peso', patient.peso, ' inputmode="decimal" placeholder="—"'), 'kg'],
      ['Talla', qInput('talla', patient.talla, ' inputmode="decimal" placeholder="—"'), 'm'],
    ]));
}

function camaIngresoHtml(patient) {
  return (
    sectionHtml('Cama',
      pairHtml('Cuarto · Cama', [['Cuarto', qInput('cuarto', patient.cuarto)], ['Cama', qInput('cama', patient.cama)]]) +
      propHtml('Sala', buildPatientSalaFieldHtml(patient)) +
      propHtml('Servicio', qInput('servicio', patient.servicio, UPPER)) +
      propHtml('Área', qInput('area', patient.area, UPPER))) +
    sectionHtml('Ingreso',
      buildPatientIngresoFechasHtml(patient, rt.getSettings(), propHtml) + buildPatientAccesosSectionHtml(patient),
      '<button type="button" class="exp-datos-sec__action" data-onclick="addPatientAccesoRow">+ Acceso</button>')
  );
}

/* Board «Datos B»: summary card, then one section at a time behind chips. */
var DATOS_TABS = [
  { id: 'censo', label: 'Censo' },
  { id: 'cama', label: 'Cama e ingreso' },
  { id: 'identidad', label: 'Identidad' },
];
var datosTab = 'censo';

function datosTabsFor(sala) {
  return DATOS_TABS.filter(function (t) {
    return sala || t.id !== 'censo';
  });
}

function datosTabsHtml(tabs, active) {
  return (
    '<div class="exp-datos-tabs" role="tablist" aria-label="Secciones">' +
    tabs
      .map(function (t) {
        var on = t.id === active;
        return (
          '<button type="button" role="tab" class="exp-datos-tab' + (on ? ' is-on' : '') + '" data-datos-tab="' + t.id + '"' +
          ' aria-selected="' + on + '" aria-controls="exp-datos-pane-' + t.id + '">' + t.label + '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}

function datosPaneHtml(id, active, body) {
  return (
    '<div class="exp-datos-pane exp-datos-pane--' + id + '" id="exp-datos-pane-' + id + '" role="tabpanel" data-datos-pane="' + id + '"' +
    (id === active ? '' : ' hidden') + '>' + body + '</div>'
  );
}

function buildPatientDemographicsFieldsHtml(patient) {
  var sala = isModeSala(rt.getSettings());
  var tabs = datosTabsFor(sala);
  var active = tabs.some(function (t) { return t.id === datosTab; }) ? datosTab : tabs[0].id;
  return (
    datosSummaryHtml() +
    datosTabsHtml(tabs, active) +
    (sala ? datosPaneHtml('censo', active, buildPatientCensoDatosSectionsHtml(patient, sectionHtml)) : '') +
    datosPaneHtml('cama', active, camaIngresoHtml(patient)) +
    datosPaneHtml('identidad', active, identidadHtml(patient))
  );
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
  if (patient.edad) bits.push(patient.edad + ' a');
  if (patient.sexo) bits.push(patient.sexo);
  if (patient.peso) bits.push(patient.peso + ' kg');
  if (patient.talla) bits.push(patient.talla + ' m');
  if (patient.registro) bits.push('Reg. ' + patient.registro);
  return bits.join(' · ');
}

function datosSummaryHtml() {
  return (
    '<div class="exp-datos-summary" data-datos-summary>' +
    '<span class="exp-datos-summary__bed" data-datos-sum="bed"></span>' +
    '<div class="exp-datos-summary__who"><p class="exp-datos-summary__name" data-datos-sum="name"></p>' +
    '<p class="exp-datos-summary__meta" data-datos-sum="meta"></p></div>' +
    '<div class="exp-datos-summary__stay"><p class="exp-datos-summary__day" data-datos-sum="day"></p>' +
    '<p class="exp-datos-summary__since" data-datos-sum="since"></p></div>' +
    '<div id="exp-datos-team-slot" class="exp-datos-team-slot"></div>' +
    '</div>'
  );
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

/** @param {Record<string, unknown>} patient @param {{ embedded?: boolean }} [opts] */
function buildPatientDemographicsCardHtml(patient, opts) {
  var fields = buildPatientDemographicsFieldsHtml(patient);
  if (opts && opts.embedded) {
    return '<div class="exp-datos-fields">' + fields + '</div>';
  }
  return (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body">' +
    fields +
    '</div></div>'
  );
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
    wrap.innerHTML = '';
    return;
  }
  wrap.dataset.patientId = String(patient.id);
  var datosMount = wrap.closest('.exp-datos-modal-body') || wrap.closest('#exp-datos-modal-mount');
  if (datosMount) datosMount.dataset.patientId = String(patient.id);
  wrap.innerHTML = buildPatientDemographicsCardHtml(patient, { embedded: true });
  var teamSlot = wrap.querySelector('#exp-datos-team-slot');
  if (teamSlot) teamSlot.innerHTML = buildPatientTeamAssignSectionHtml(patient);
  paintDatosSummary(wrap, patient);
  refreshRpcDateFields(wrap);
  wirePatientTeamAssignRefresh();
  wireDatosPane(wrap);
}

export { buildPatientDemographicsCardHtml, renderPatientDataPane };
