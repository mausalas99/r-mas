/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_848 = [
  {
    title: 'Velocidad de norepinefrina',
    body: 'En Estado actual, cada línea de norepinefrina tiene una caja para la velocidad en mcg/min. La dosis de la línea cambia al escribirla.',
  },
  {
    title: 'Suero y fármaco en una línea',
    body: 'Al pegar indicaciones, un suero con «VEL INF» y su fármaco se unen con «DILUIR EN:». El botón de la receta dice «Enviar a Estado Actual».',
  },
  {
    title: 'PDF en una hoja',
    body: 'Las formas de Nota e Indicaciones se reducen hasta caber en una hoja. El nombre del archivo lleva la hora.',
  },
  {
    title: 'Registro y tablero más claros',
    body: 'T/A muestra las dos cifras juntas con una diagonal. El conteo del tablero de Interconsultas cuenta solo tu equipo.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_848;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.8': RELEASE_NOTES_848,
};
