/**
 * Actualizar labs — single-patient vs team mode helpers.
 */

/**
 * @param {{ getActivePatient?: () => object|null }} rt
 * @returns {{ id: string, nombre: string, registro: string, hasRegistro: true, selected: true, hint: string }|null}
 */
export function resolveActivePatientBatchRow(rt) {
  var p = rt && typeof rt.getActivePatient === 'function' ? rt.getActivePatient() : null;
  if (!p || !p.id) return null;
  var reg = String(p.registro || '').trim();
  if (!reg) return null;
  return {
    id: String(p.id),
    nombre: String(p.nombre || 'Sin nombre'),
    registro: reg,
    hasRegistro: true,
    selected: true,
    hint: '',
  };
}

/**
 * @param {boolean} singlePatientMode
 * @param {{ nombre?: string, registro?: string }|null|undefined} row
 */
export function syncBatchModalModeUi(singlePatientMode, row) {
  var title = document.getElementById('lab-repo-batch-title');
  var hint = document.getElementById('lab-repo-batch-hint');
  var teamBlock = document.getElementById('lab-repo-batch-team-block');
  if (singlePatientMode && row) {
    if (title) title.textContent = 'Actualizar labs';
    if (hint) {
      hint.textContent =
        (row.nombre || 'Paciente') + ' · Reg. ' + row.registro + ' · elige el rango de fechas';
    }
    if (teamBlock) teamBlock.hidden = true;
    return;
  }
  if (title) title.textContent = 'Actualizar labs';
  if (hint) hint.textContent = 'Mi equipo · rango compartido · la cola queda en la barra lateral';
  if (teamBlock) teamBlock.hidden = false;
}

/**
 * Active patient without registro cannot use single-patient repo fetch.
 * @param {{ getActivePatient?: () => object|null }} rt
 * @returns {string|null} error toast message, or null if ok
 */
export function activePatientMissingRegistroMessage(rt) {
  var p = rt && typeof rt.getActivePatient === 'function' ? rt.getActivePatient() : null;
  if (!p || !p.id) return null;
  if (String(p.registro || '').trim()) return null;
  return 'El paciente no tiene registro para consultar el repositorio';
}
