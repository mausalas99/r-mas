/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_847 = [
  {
    title: 'Equipo dentro de Mi perfil',
    body: 'Bajo la tarjeta de Sala hay botones de Equipo. Filtras por sala y tocas un equipo para unirte.',
  },
  {
    title: 'Letra de ciclo por equipo',
    body: 'Al editar un equipo puedes poner una letra de A a D. Marca el día de guardia del mes.',
  },
  {
    title: 'Ingreso de Interconsultas más claro',
    body: 'Completar el ingreso tiene su propia ventana. Pide servicio, motivo y las fechas de ingreso y de interconsulta.',
  },
  {
    title: 'Vista previa para imprimir',
    body: 'Generar Nota e Indicaciones abre una vista previa. Desde ahí imprimes o sacas PDF y .docx.',
  },
  {
    title: 'Anteriores se queda contigo',
    body: 'Las copias de Anteriores ya no se pierden al sincronizar con la Nube. Ahora también las puedes editar o eliminar.',
  },
  {
    title: 'Tu sala ya no se pisa',
    body: 'Una copia vieja en la nube ya no cambia tu sala. Al cambiar de sala, los filtros fijados del censo se limpian.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_847;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.7': RELEASE_NOTES_847,
};
