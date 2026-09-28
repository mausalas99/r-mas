/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_843 = [
  {
    title: 'Barra superior en una pastilla',
    body: 'Paciente, Laboratorio, Manejo y Agenda comparten una pastilla que se abre al pasar el cursor. Atajos y Aprender R+ viven en Ayuda (?).',
  },
  {
    title: 'Tacha medicamentos en Datos',
    body: 'Toca un medicamento en Datos › Censo para tacharlo. Sale del censo y regresa con otro toque.',
  },
  {
    title: 'Tarjetas, Resumen y Laboratorio más claros',
    body: 'Tarjetas de la lista en dos líneas, con acciones al pasar el cursor. Resumen con tendencias de signos y labs. Laboratorio muestra quién es y los alterados primero.',
  },
  {
    title: 'Nube, Admin y Ajustes nuevos',
    body: 'Nueva pantalla de estado de Nube, Admin rediseñado, Mi perfil en Ajustes y nuevo panel de Equipos.',
  },
  {
    title: 'Sincronización más confiable',
    body: 'VPO, lista de problemas y perfil farmacológico se sincronizan con Nube. Lo que restauras con «deshacer» ya no se pierde.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_843;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.3': RELEASE_NOTES_843,
};
