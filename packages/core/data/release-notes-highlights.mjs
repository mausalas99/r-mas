/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_846 = [
  {
    title: 'Un R2 puede cubrir 2 equipos',
    body: 'En Sala, un R2 ahora puede estar en hasta 2 equipos a la vez. Cada R2 lleva su propia letra de guardia. Un tercer equipo se rechaza con un aviso claro.',
  },
  {
    title: 'Pistas en pantalla, a tu gusto',
    body: 'En Ajustes hay un interruptor nuevo, «Pistas en pantalla». Enciende o apaga los globos que enseñan R+ y cuentan las novedades.',
  },
  {
    title: 'Textos de equipo más claros',
    body: 'Al unirte a un equipo, R+ te dice que pidas el código al «líder de tu equipo», no solo al R2.',
  },
  {
    title: 'Arreglos pequeños',
    body: 'Los avisos vuelven arriba a la derecha. La gráfica de balance acumulado cabe en su espacio. Apagar el demo de interconsultas limpia sus asignaciones.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_846;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.6': RELEASE_NOTES_846,
};
