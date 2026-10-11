/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_851 = [
  {
    title: 'Pantallas con un solo estilo',
    body: 'Resumen, Labs, Manejo, Datos, Agenda, Ajustes y más usan tarjetas con sombra, títulos más claros y un solo botón lleno por pantalla.',
  },
  {
    title: 'Tiempo de respuesta de interconsulta',
    body: 'Las tarjetas del tablero muestran <strong>Recibida</strong> y <strong>Respondida</strong>, con el promedio de 7 días. Los tiempos marcados en el teléfono llegan por Nube.',
  },
  {
    title: 'Estado actual con texto corrido',
    body: 'Pega glucometrías, ingresos, egresos, evacuaciones y signos vitales escritos en una frase, y R+ los lee.',
  },
  {
    title: 'Mi perfil se guarda solo',
    body: 'Cambia un dato y queda guardado. Ya no existe el botón «Guardar perfil».',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_851;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.1': RELEASE_NOTES_851,
};
