/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_831 = [
  {
    title: 'Corrección — equipos nuevos que desaparecían',
    body:
      'Un equipo recién creado ya no se vuelve invisible para toda la sala — se corrigieron <strong>tres fallas</strong> distintas en la sincronización.',
  },
  {
    title: 'Corrección — R+ Móvil por código QR',
    body:
      'Unirse a una sala desde el código QR ya no deja los pacientes <strong>vacíos</strong> en iPad.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_831;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.1': RELEASE_NOTES_831,
};
