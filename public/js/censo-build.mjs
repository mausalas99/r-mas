/** Nombre completo del paciente para columna Paciente del censo (no aplica al equipo). */
export function formatPatientNameForCenso(name) {
  var s = String(name || '')
    .replace(/\s+/g, ' ')
    .trim();
  return s || '—';
}
