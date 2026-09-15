/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_837 = [
  {
    title: 'RetC ya no se contagia entre días',
    body: 'Al pegar varias semanas de laboratorios juntas, un solo valor de reticulocito ya no se combinaba con la biometría de otro día para inventar un RetC falso.',
  },
  {
    title: 'Actualizar labs refresca todo al toque',
    body: 'La lista de fechas en Laboratorio, el panel de tendencias y el campo de estudios de la nota se actualizan de inmediato, sin tener que cambiar de paciente y volver.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_837;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.7': RELEASE_NOTES_837,
};
