import { accesoFechaToDateInputValue } from './patient-date-fields.mjs';
import { resolveCensoFimiLabel } from './censo-header-format.mjs';
import { esc } from './dom-escape.mjs';

function dateInputHtml(field, value) {
  return (
    '<input type="date" class="rpc-date-input" value="' + esc(accesoFechaToDateInputValue(value)) +
    '" data-oninput="updatePatient" data-oninput-args=\'["' + field + '"]\' data-oninput-pass="value">'
  );
}

/**
 * FIUX (urgencias) y FIMI/servicio — fechas con calendario rpc-date, one row each.
 * @param {Record<string, unknown>} patient
 * @param {Record<string, unknown>} settings
 * @param {(label: string, control: string, title?: string) => string} prop
 */
export function buildPatientIngresoFechasHtml(patient, settings, prop) {
  return (
    prop('FIUX', dateInputHtml('fiuxFecha', patient.fiuxFecha), 'Ingreso a urgencias') +
    prop(resolveCensoFimiLabel(settings || {}), dateInputHtml('fimiFecha', patient.fimiFecha), 'Ingreso al servicio')
  );
}
