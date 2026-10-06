/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_849 = [
  {
    title: 'Rotaciones fuera de Medicina Interna',
    body: 'Si rotas en <strong>UCI</strong>, <strong>PostQx</strong> o una <strong>Subespecialidad</strong>, elige «Otra rotación (fuera de MI)» y luego tu servicio. Cada servicio tiene su propia sala Nube.',
  },
  {
    title: 'Aviso de pacientes sin equipo',
    body: 'Si un equipo se archivó, sus pacientes quedan sin equipo. Ahora R+ te avisa al abrir cuántos fueron.',
  },
  {
    title: 'Instalador de Windows más claro',
    body: 'El archivo se llama <strong>Instalar-R+</strong> y crea siempre el acceso directo en el escritorio, también al reinstalar.',
  },
  {
    title: 'Signos fuera de rango',
    body: 'Guardia, Inicio de turno y la gráfica marcan solo los signos vitales fuera de rango.',
  },
  {
    title: 'Cultivos en el teléfono',
    body: 'Los cultivos se quedan en la app móvil después de la ventana de labs, porque el antibiograma llega días después.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_849;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.9': RELEASE_NOTES_849,
};
