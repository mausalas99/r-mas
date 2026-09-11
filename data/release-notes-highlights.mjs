/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_835 = [
  {
    title: 'Arreglado — foco visual en Registrar medición',
    body:
      'El signo vital autoseleccionado (TAS) ya no muestra un recuadro extra alrededor del número.',
  },
  {
    title: 'Mejorado — un solo recuadro de foco por tarjeta',
    body:
      'El recuadro de foco ahora marca <strong>toda la tarjeta</strong> del signo vital, en vez de dos recuadros superpuestos.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_835;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.5': RELEASE_NOTES_835,
};
