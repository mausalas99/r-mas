/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_842 = [
  {
    title: 'Pega la dirección del portal de laboratorio',
    body: 'R+ ya no trae la dirección del portal. Pégala una vez en Ajustes → Laboratorio para consultar labs y cultivos.',
  },
  {
    title: 'Menos datos institucionales',
    body: 'Se quitaron nombres y datos del hospital del código y la documentación. Las pruebas usan datos sintéticos.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_842;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.2': RELEASE_NOTES_842,
};
