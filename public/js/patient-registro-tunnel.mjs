/**
 * Alta por registro: consulta repositorio (túnel Actualizar labs) y confirma antes de admitir.
 */
import { escHtml } from './dom-escape.mjs';
import {
  labRepoDefaultDateRange,
  labRepoToDateInputValue,
  labRepoFetchRangeFromDateInputs,
} from './features/lab-repo-import.mjs';
import { buildLabRepoBulkText } from './features/lab-repo-import-gate.mjs';
import { procesarLabs } from './labs.js';
import {
  commitStubPatientFromLab,
  findPatientByRegistro,
} from './features/patients-modal-commit.mjs';
import { parseRegistrosFromBulkInput } from './patient-registro-parse.mjs';
import { rt } from './features/patients-runtime-state.mjs';

function defaultFetchRange() {
  var range = labRepoDefaultDateRange();
  return labRepoFetchRangeFromDateInputs(
    labRepoToDateInputValue(range.desde),
    labRepoToDateInputValue(range.hasta)
  );
}

function parseLabPatientFromStudies(studies, registro) {
  var text = buildLabRepoBulkText(studies);
  if (!text) return { expediente: registro, name: '' };
  try {
    var result = procesarLabs(text);
    var p = result && result.patient ? result.patient : {};
    return {
      expediente: String(p.expediente || registro || '').trim(),
      name: String(p.name || '').trim(),
      edad: p.edad,
      sexo: p.sexo,
    };
  } catch (_e) {
    return { expediente: registro, name: '' };
  }
}

function removeConfirmBackdrop() {
  var el = document.getElementById('patient-registro-tunnel-backdrop');
  if (el) el.remove();
}

/**
 * @param {object} labPatient
 * @param {number} studyCount
 * @param {() => void} onConfirm
 * @param {{ index?: number, total?: number }} [batch]
 * @param {() => void} onOmit
 * @param {() => void} [onStopBatch]
 */
function showRegistroTunnelConfirm(labPatient, studyCount, onConfirm, batch, onOmit, onStopBatch) {
  removeConfirmBackdrop();
  var nombre = String(labPatient.name || '').trim() || 'Sin nombre en repositorio';
  var reg = String(labPatient.expediente || '').trim();
  var batchTotal = batch && batch.total > 1 ? batch.total : 0;
  var batchIndex = batch && batch.index ? batch.index : 0;
  var title =
    batchTotal > 1 ? '¿Es este paciente? (' + batchIndex + ' de ' + batchTotal + ')' : '¿Es este paciente?';
  var omitLabel = batchTotal > 1 ? 'Omitir' : 'Cancelar';
  var stopBtn =
    batchTotal > 1
      ? '<button type="button" class="btn-cancel" id="patient-registro-tunnel-stop">Detener cola</button>'
      : '';
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'patient-registro-tunnel-backdrop';
  backdrop.innerHTML =
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true">' +
    '<h3>' +
    escHtml(title) +
    '</h3>' +
    '<p><strong>' +
    escHtml(nombre) +
    '</strong><br>Registro: ' +
    escHtml(reg) +
    (studyCount
      ? '<br>' + studyCount + ' estudio' + (studyCount === 1 ? '' : 's') + ' en el rango'
      : '') +
    '</p>' +
    '<div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">' +
    stopBtn +
    '<button type="button" class="btn-cancel" id="patient-registro-tunnel-cancel">' +
    escHtml(omitLabel) +
    '</button>' +
    '<button type="button" class="btn-conflict-primary" id="patient-registro-tunnel-confirm">Agregar al censo</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  document.getElementById('patient-registro-tunnel-cancel').onclick = function () {
    removeConfirmBackdrop();
    onOmit();
  };
  var stopEl = document.getElementById('patient-registro-tunnel-stop');
  if (stopEl && onStopBatch) {
    stopEl.onclick = function () {
      removeConfirmBackdrop();
      onStopBatch();
    };
  }
  document.getElementById('patient-registro-tunnel-confirm').onclick = function () {
    removeConfirmBackdrop();
    onConfirm(labPatient);
  };
}

function toastPatientAdmitted(silent) {
  if (silent) return;
  rt.showToast('Paciente agregado al censo — completa ubicación', 'success');
}

/**
 * @param {string} registro
 * @param {{
 *   onAdmitted?: (patient: object) => void,
 *   onCancel?: () => void,
 *   teamId?: string,
 *   batch?: { index: number, total: number },
 *   silentToast?: boolean,
 *   onStopBatch?: () => void,
 * }} [opts]
 */
export async function admitPatientViaRegistroTunnel(registro, opts) {
  opts = opts || {};
  var reg = String(registro || '').trim();
  if (!reg) {
    rt.showToast('Indica el registro', 'error');
    return null;
  }
  var existing = findPatientByRegistro(reg);
  if (existing) {
    rt.showToast('Reg. ' + reg + ' ya está en el censo', 'info');
    if (typeof opts.onAdmitted === 'function') opts.onAdmitted(existing);
    return existing;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== 'function') {
    rt.showToast('Consulta por registro solo en la app de escritorio', 'warn');
    return null;
  }
  var range = defaultFetchRange();
  if (!range) {
    rt.showToast('No se pudo calcular el rango de fechas', 'error');
    return null;
  }
  rt.showToast('Consultando repositorio…', 'info');
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: reg,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString(),
    });
    var studies = (res && res.studies) || [];
    var labPatient = parseLabPatientFromStudies(studies, reg);
    if (!labPatient.expediente) labPatient.expediente = reg;
    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      showRegistroTunnelConfirm(
        labPatient,
        studies.length,
        function (confirmedPatient) {
          var patient = commitStubPatientFromLab(confirmedPatient, { teamId: opts.teamId });
          if (patient) {
            toastPatientAdmitted(opts.silentToast);
            if (typeof opts.onAdmitted === 'function') opts.onAdmitted(patient);
          }
          finish(patient);
        },
        opts.batch,
        function () {
          if (typeof opts.onCancel === 'function') opts.onCancel();
          finish(null);
        },
        function () {
          if (typeof opts.onStopBatch === 'function') opts.onStopBatch();
          if (typeof opts.onCancel === 'function') opts.onCancel();
          finish(null);
        }
      );
    });
  } catch (e) {
    console.error(e);
    rt.showToast('Error al consultar el repositorio', 'error');
    return null;
  }
}

/**
 * @param {string | string[]} rawOrList
 * @param {{ teamId?: string, onAdmitted?: (patient: object) => void }} [opts]
 */
export async function admitPatientsViaRegistroTunnel(rawOrList, opts) {
  opts = opts || {};
  var list = Array.isArray(rawOrList)
    ? rawOrList
        .map(function (r) {
          return String(r || '').trim();
        })
        .filter(Boolean)
    : parseRegistrosFromBulkInput(rawOrList);
  if (!list.length) {
    rt.showToast('Indica al menos un registro', 'error');
    return { admitted: [], omitted: [] };
  }
  if (list.length === 1) {
    var one = await admitPatientViaRegistroTunnel(list[0], opts);
    return {
      admitted: one ? [one] : [],
      omitted: one ? [] : [list[0]],
    };
  }

  var admitted = [];
  var omitted = [];
  var stopped = false;
  for (var i = 0; i < list.length && !stopped; i++) {
    var reg = list[i];
    var patient = await admitPatientViaRegistroTunnel(reg, {
      teamId: opts.teamId,
      batch: { index: i + 1, total: list.length },
      silentToast: true,
      onAdmitted: opts.onAdmitted,
      onStopBatch: function () {
        stopped = true;
      },
    });
    if (patient) admitted.push(patient);
    else omitted.push(reg);
  }

  if (admitted.length) {
    rt.showToast(
      admitted.length +
        ' paciente' +
        (admitted.length === 1 ? '' : 's') +
        ' agregado' +
        (admitted.length === 1 ? '' : 's') +
        ' — completa ubicación',
      'success'
    );
  } else if (omitted.length) {
    rt.showToast('No se agregaron pacientes', 'info');
  }
  return { admitted: admitted, omitted: omitted };
}
