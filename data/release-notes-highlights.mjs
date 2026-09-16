/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_838 = [
  {
    title: 'Muestra hemolizada ya no inventa un valor',
    body: 'Una fila de laboratorio sin resultado (solo <strong>*</strong>, muestra hemolizada o rechazada) ya no tomaba el mínimo del rango como si fuera el valor real.',
  },
  {
    title: 'RetC encuentra el Hto en GASOMETRIA',
    body: 'El reticulocito corregido ahora empareja con el hematocrito aunque la etiqueta esté separada por tabulador o salto de línea, no solo espacio.',
  },
  {
    title: 'Mejorado — sincronización más confiable',
    body: 'La Nube resiste mejor un reintento casi simultáneo y un reinicio de la app, sin reenviar de más ni perder de vista lo ya sincronizado.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_838;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.8': RELEASE_NOTES_838,
};
