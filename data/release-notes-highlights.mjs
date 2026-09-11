/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_834 = [
  {
    title: 'Nuevo — Admin, Red, Equipo y Mi Perfil rediseñados',
    body:
      'Filas más claras con menú de acciones unificado, tarjetas de equipo colapsadas por defecto, y Mi Perfil agrupado en dos secciones.',
  },
  {
    title: 'Nuevo — laboratorios: DEPCR y reticulocito corregido',
    body:
      'DEPCR (depuración de creatinina de 24h) ahora es su propio estudio, y se calcula el <strong>reticulocito corregido (RetC)</strong>.',
  },
  {
    title: 'Arreglado — congelamiento en diálogos de confirmación',
    body:
      'Un diálogo destructivo abierto sobre Administración ya <strong>no puede congelar la app</strong>.',
  },
  {
    title: 'Mejorado — acciones destructivas más visibles',
    body:
      'Eliminar y Quitar ahora se ven en <strong>rojo</strong> para evitar clics accidentales.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_834;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.4': RELEASE_NOTES_834,
};
