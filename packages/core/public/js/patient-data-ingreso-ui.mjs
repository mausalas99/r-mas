import { accesoFechaToDateInputValue } from './patient-date-fields.mjs';
import { resolveCensoFimiLabel } from './censo-header-format.mjs';
import { esc } from './dom-escape.mjs';
import { isModeSala } from './mode-features.mjs';

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
  const ic = !isModeSala(settings);
  return (
    prop(ic ? 'FI' : 'FIUX', dateInputHtml('fiuxFecha', patient.fiuxFecha), ic ? 'Fecha de ingreso' : 'Ingreso a urgencias') +
    prop(resolveCensoFimiLabel(settings || {}), dateInputHtml('fimiFecha', patient.fimiFecha), ic ? 'Fecha de interconsulta MI' : 'Ingreso al servicio')
  );
}
