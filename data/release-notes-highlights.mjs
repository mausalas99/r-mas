/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_833 = [
  {
    title: 'Nuevo — pestaña Red en Administración',
    body:
      'Ve y filtra los pacientes de <strong>todas las áreas</strong> desde un solo lugar, con acciones de archivar, restaurar y eliminar (una por una o en bloque).',
  },
  {
    title: 'Arreglado — pacientes nuevos que no llegaban a otros dispositivos',
    body:
      'Cuando una sala pasaba de <strong>50 pacientes en el mes</strong>, los ingresos nuevos se guardaban solo en el dispositivo que los creó. Ya no.',
  },
  {
    title: 'Arreglado — la Nube ya no se queda colgada',
    body:
      'Si la conexión falla a mitad de una sincronización, ahora se corta a los <strong>20 segundos</strong> con un aviso claro, en vez de quedarse esperando para siempre.',
  },
  {
    title: 'Mejorado — diálogos de confirmación en Administración',
    body:
      'Rotar código, archivar, eliminar: los diálogos de confirmación ahora se ven <strong>encima</strong> del panel, no detrás.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_833;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.3': RELEASE_NOTES_833,
};
