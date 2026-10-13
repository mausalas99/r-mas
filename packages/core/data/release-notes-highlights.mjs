/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_851 = [
  {
    title: 'HD: R+ avisa, tú decides',
    body: 'Con TA baja, FC anormal o un vasopresor, la línea HD dice <strong>¿INESTABLE?</strong> para que lo confirmes. Antes decía siempre ESTABLE.',
  },
  {
    title: 'Balance con todos los egresos',
    body: 'Las gráficas de balance cuentan drenajes, gastrostomía, nefrostomía y UF, no solo la diuresis.',
  },
  {
    title: 'Tu sesión de Nube, protegida',
    body: '«Recuérdame» guarda la sesión cerrada con el llavero del equipo. Una base cifrada antigua se respalda en una carpeta, ya no se borra.',
  },
  {
    title: 'Interno en salas cifradas',
    body: 'El teléfono del interno vuelve a abrir el tablero y a mandar signos en salas cifradas.',
  },
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
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_851;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.1': RELEASE_NOTES_851,
};
