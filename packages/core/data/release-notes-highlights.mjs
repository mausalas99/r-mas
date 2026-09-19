/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_840 = [
  {
    title: 'Registro y diagnósticos ahora se cifran en Nube',
    body: 'El número de historia clínica y los diagnósticos viajaban en texto plano por el servidor. Ahora se cifran igual que la nota y las indicaciones.',
  },
  {
    title: 'Sincronización instantánea entre ventanas',
    body: 'Un cambio hecho en un equipo ahora aparece al instante en las otras ventanas abiertas de la misma sala, sin esperar el siguiente ciclo de sincronización.',
  },
  {
    title: 'Censo impreso ya no achica el texto de más',
    body: 'Si el censo es muy largo, la vista de impresión ahora pagina en vez de encoger el texto más allá de un límite legible.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_840;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.0': RELEASE_NOTES_840,
};
