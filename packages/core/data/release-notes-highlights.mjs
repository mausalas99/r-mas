/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_842 = [
  {
    title: 'Guías junto a los botones',
    body: 'Burbujas «Guía» y «Nuevo» te enseñan R+ y lo nuevo de esta versión, junto al botón real. La × termina una guía.',
  },
  {
    title: 'Pega la dirección del portal de laboratorio',
    body: 'R+ ya no trae la dirección del portal. Pégala una vez en Ajustes → Laboratorio para usar Actualizar labs y cultivos.',
  },
  {
    title: 'Datos, Resumen y censo nuevos',
    body: 'Datos con nuevo diseño, cultivos por sitio, Resumen de un vistazo y censo con columnas a elegir y labs como diagramas.',
  },
  {
    title: 'Sala y medicamentos',
    body: 'Archiva desde la tarjeta, corrige el día de antibiótico y revisa fármacos escondidos en agua inyectable.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_842;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.2': RELEASE_NOTES_842,
};
