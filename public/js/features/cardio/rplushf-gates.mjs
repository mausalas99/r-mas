/** R+ HF feature gates — LAN/Nube sync UI and rotation/team UI stay off; cardio Salida stays mostly intact. */

export function isSyncUiEnabled() {
  return false;
}

export function hospitalizacionModeLabel() {
  return 'Hospitalización';
}

export function consultaExternaModeLabel() {
  return 'Consulta Externa';
}

/**
 * Drop VPO (Med-Interna preop clearance), Listado de problemas, and Receta HU
 * — none apply to the cardiology HF workflow. Salida instead carries the
 * cardio-only "Hoja IC" docx export (`hojaIC`).
 */
export function filterSalidaSectionsForHf(sections) {
  var kept = (sections || []).filter((s) => s !== 'vpo' && s !== 'listado' && s !== 'recetaHu');
  return kept.concat('hojaIC');
}

export function hfProductName() {
  return 'R+ HF';
}
