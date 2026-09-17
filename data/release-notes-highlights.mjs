/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_839 = [
  {
    title: 'Pacientes recién admitidos ya no se pierden de la Nube',
    body: 'Si la asignación de equipo de un paciente llegaba en un ciclo de red distinto al del paciente mismo, la admisión podía descartarse de la sincronización para siempre. Ya no.',
  },
  {
    title: 'Arreglada la animación de Pendientes',
    body: 'Al agregar un pendiente, la fila ya no se armaba dos veces seguidas y borraba su propia animación de entrada. Completar uno ahora muestra un color de éxito breve.',
  },
  {
    title: 'Censo para imprimir entra en una hoja',
    body: 'La vista de impresión del censo ahora se ajusta para caber en una sola página en vez de cortarse en varias.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_839;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.9': RELEASE_NOTES_839,
};
