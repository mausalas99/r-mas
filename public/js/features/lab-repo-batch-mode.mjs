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
 * Single-patient (solo fechas) solo cuando no hay 2+ del equipo con registro.
 * Con 2+ en mi equipo → siempre modal con checkboxes.
 *
 * @param {Array<{ hasRegistro?: boolean }>} teamRows
 * @param {{ id: string, registro: string }|null|undefined} activeRow
 * @returns {{ singlePatientMode: boolean, rows: object[] }}
 */
export function resolveBatchOpenMode(teamRows, activeRow) {
  var team = Array.isArray(teamRows) ? teamRows : [];
  var withReg = team.filter(function (r) {
    return r && r.hasRegistro;
  });
  if (withReg.length >= 2) {
    return { singlePatientMode: false, rows: team };
  }
  if (activeRow && activeRow.registro) {
    return { singlePatientMode: true, rows: [activeRow] };
  }
  if (withReg.length === 1) {
    return { singlePatientMode: true, rows: [withReg[0]] };
  }
  return { singlePatientMode: false, rows: team };
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
 * Active patient without registro — only blocks when we cannot fall back to team list.
 * @param {{ getActivePatient?: () => object|null }} rt
 * @param {number} teamWithRegistroCount
 * @returns {string|null}
 */
export function activePatientMissingRegistroMessage(rt, teamWithRegistroCount) {
  var p = rt && typeof rt.getActivePatient === 'function' ? rt.getActivePatient() : null;
  if (!p || !p.id) return null;
  if (String(p.registro || '').trim()) return null;
  if (teamWithRegistroCount > 0) return null;
  return 'El paciente no tiene registro para consultar el repositorio';
}
