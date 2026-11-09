/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_854 = [
  {
    title: 'Antibiograma con CLSI',
    body: 'La CMI se interpreta con los puntos de corte de <strong>CLSI M100 2026</strong>. Si hay duda, no se interpreta.',
  },
  {
    title: 'Pistas de resistencia',
    body: 'Aviso de posible <strong>BLEE o AmpC</strong> y de <strong>resistencia esperada</strong>. Es cribado, no diagnóstico.',
  },
  {
    title: 'Cultivos sin revisar',
    body: 'Un cultivo o antibiograma nuevo queda pendiente hasta que lo marcas. <strong>⌘⇧C</strong> copia los cultivos del equipo.',
  },
  {
    title: 'Registro por pasos',
    body: 'En Estado actual, el registro manual va en <strong>Signos, Glucosa, Balance y Revisar</strong>. Avanza solo.',
  },
  {
    title: 'Censo más claro',
    body: 'Negrita solo para lo <strong>anormal</strong> en Labs y Signos. Cultivos y signos ocupan menos líneas.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_854;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.4': RELEASE_NOTES_854,
};
