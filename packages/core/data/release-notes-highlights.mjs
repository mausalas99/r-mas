/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_853 = [
  {
    title: 'Ajustes del censo en todos tus equipos',
    body: 'Doctor, médicos, servicio, sala y torre se <strong>sincronizan por Nube</strong>. El iPad usa el mismo encabezado que el escritorio.',
  },
  {
    title: 'Aprobar usuarios del iPad',
    body: 'Los usuarios nuevos del iPad esperan en la pestaña <strong>Solicitudes</strong> de Admin. Tú eliges la sala y apruebas o rechazas.',
  },
  {
    title: 'Aviso de sesión Nube perdida',
    body: 'Si el dispositivo pierde la sesión sin que cierres, aparece la pastilla <strong>«Sin sesión Nube»</strong>. Un clic abre el inicio de sesión.',
  },
  {
    title: 'Sincronización más firme',
    body: 'Labs que llegan antes que su paciente ya no se pierden, y un nombre real ya no se pisa con un marcador.',
  },
  {
    title: 'Tendencias con línea guía',
    body: 'Una línea fina sigue el cursor y el número grande muestra el <strong>valor bajo el cursor</strong>.',
  },
  {
    title: 'Signos vitales dudosos',
    body: 'Un valor imposible se marca con <strong>⚠</strong>. Un clic te lleva al campo para revisarlo.',
  },
  {
    title: 'MRSA en el antibiograma',
    body: 'El tamiz de cefoxitina positivo cuenta como <strong>resistente</strong>. Antes caía en sensible.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_853;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.3': RELEASE_NOTES_853,
};
