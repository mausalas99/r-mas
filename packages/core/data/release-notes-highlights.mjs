/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_844 = [
  {
    title: 'Laboratorio rediseñado',
    body: 'Diseño nuevo, con días anteriores del historial, tablas de SOME mejor leídas y sin estudios repetidos. Pega el PDF de Reumatología y R+ lo lee.',
  },
  {
    title: 'Tendencias con panel de estudio nuevo',
    body: 'El panel ocupa todo el ancho. Chips en la tabla, pestañas de gráficas con la lista de analitos y una tabla dinámica en ventana.',
  },
  {
    title: 'Barra superior y lista más limpias',
    body: 'La pastilla de área activa se une con Tendencias. Las tarjetas de una línea ya no dejan huecos y los medicamentos del Resumen no se parten.',
  },
  {
    title: 'Nube más estable',
    body: 'Cada expediente queda en su propia fila, así borrar muchos ya no satura el servidor. Las eventualidades y el monitoreo ya no se pierden al sincronizar a la vez.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_844;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.4': RELEASE_NOTES_844,
};
