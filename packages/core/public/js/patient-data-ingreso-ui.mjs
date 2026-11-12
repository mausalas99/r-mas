import { accesoFechaToDateInputValue } from './patient-date-fields.mjs';
import { resolveCensoFimiLabel } from './censo-header-format.mjs';
import { isModeSala } from './mode-features.mjs';

/**
 * FIUX (urgencias) y FIMI/servicio — fechas con calendario rpc-date, one row each.
 * @param {Record<string, unknown>} patient
 * @param {Record<string, unknown>} settings
 * @returns {{ label: string, title: string, field: string, value: string }[]}
 */
export function ingresoFechasRows(patient, settings) {
  const ic = !isModeSala(settings);
  return [
    { label: ic ? 'FI' : 'FIUX', title: ic ? 'Fecha de ingreso' : 'Ingreso a urgencias', field: 'fiuxFecha', value: accesoFechaToDateInputValue(patient.fiuxFecha) },
    { label: resolveCensoFimiLabel(settings || {}), title: ic ? 'Fecha de interconsulta MI' : 'Ingreso al servicio', field: 'fimiFecha', value: accesoFechaToDateInputValue(patient.fimiFecha) },
  ];
}
