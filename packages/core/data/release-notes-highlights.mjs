/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_857 = [
  {
    title: 'Neurológico más completo',
    body: 'Estado actual suma <strong>alerta, Glasgow, RASS y focalización</strong> en la tarjeta Neurológico.',
  },
  {
    title: 'Esferas por botón',
    body: 'Elige <strong>Tiempo, Lugar y Persona</strong>. La línea N: nombra lo que falla.',
  },
  {
    title: 'Labs del día sin repetidos',
    body: 'Un reporte con gases <strong>ya no se mezcla</strong> con otro. Se quitan copias y renglones repetidos.',
  },
  {
    title: 'Fechas de labs reparadas',
    body: 'Los sets guardados con una fecha dañada <strong>se corrigen solos</strong>.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_857;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.7': RELEASE_NOTES_857,
};
