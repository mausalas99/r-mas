/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_832 = [
  {
    title: 'Nuevo — pestaña Medicamentos',
    body:
      'En Sala, <strong>Paciente → Clínico</strong> tiene una pestaña de administración por horario de toma, más un registro aparte para PRN.',
  },
  {
    title: 'Nuevo — balance de líquidos por turno',
    body:
      'Estado actual separa entradas y salidas en <strong>T1/T2/T3</strong>, con otras fuentes cuantificables (ultrafiltrado, drenaje, toracocentesis) y un recordatorio de hemodiálisis.',
  },
  {
    title: 'Nuevo — estudios y procedimientos a Pendientes',
    body:
      'Al pegar el bloque de Manejo, los <strong>estudios de imagen</strong> y procedimientos se agregan solos a Pendientes.',
  },
  {
    title: 'Mejorado — Solución Stanford y copiar Estado actual',
    body:
      'Los medicamentos de Solución Stanford se agrupan en una línea, y el texto copiado ahora pega en <strong>negritas reales</strong>.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_832;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.2': RELEASE_NOTES_832,
};
