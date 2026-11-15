/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_856 = [
  {
    title: 'Orina en labs de 3 días',
    body: 'El <strong>EGO</strong> aparece en los labs de 3 días del censo.',
  },
  {
    title: 'Sin reportes duplicados',
    body: 'Si un lab llega dos veces el mismo día, <strong>se cuenta una sola vez</strong>.',
  },
  {
    title: 'Equipos para admin y R4',
    body: 'Admin y R4 ven <strong>todos los equipos activos</strong>.',
  },
  {
    title: 'Texto más legible',
    body: 'Buscadores y controles pequeños usan <strong>16 px</strong>. Se quitaron los emojis de Guardia, Entrega y labs.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_856;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.6': RELEASE_NOTES_856,
};
