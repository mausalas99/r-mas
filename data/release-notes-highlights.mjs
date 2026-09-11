/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_835 = [
  {
    title: 'Arreglado — foco visual en Registrar medición',
    body:
      'El recuadro de foco del signo vital autoseleccionado (TAS) ahora marca <strong>toda la tarjeta</strong>, no el número.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_835;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.5': RELEASE_NOTES_835,
};
