/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_845 = [
  {
    title: 'Notas e indicaciones con Nube',
    body: 'La nota de evolución, el interrogatorio y las indicaciones ahora se sincronizan entre tus equipos. Gana la edición más reciente. Un texto muy largo se queda en este equipo y Conexión muestra «Pendiente».',
  },
  {
    title: 'Salir de una sala o equipo ya funciona',
    body: 'Al salir de una sala, R+ ya no te vuelve a meter solo al abrir la app. Al salir de un equipo, una copia vieja de la sala ya no deshace el cambio ni te saca de tu equipo nuevo.',
  },
  {
    title: 'Estado actual más fiel',
    body: 'El DIA de la Solución Stanford avanza por fecha, igual que en Egreso. Las sugerencias ventilatorias se actualizan al cambiar FiO₂, PEEP, P meseta o VT, y ya no aparecen campos ocultos en Alto flujo.',
  },
  {
    title: 'Tendencias y limpieza',
    body: 'Los gasométricos con coma decimal o con «<» ya muestran su tarjeta. El potasio oral ya no cuenta como reposición. R+ borra al iniciar claves viejas que llenaban el almacenamiento.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_845;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.5': RELEASE_NOTES_845,
};
