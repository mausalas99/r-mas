/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_841 = [
  {
    title: 'Fusión de labs más segura',
    body: 'Si dos tomas del mismo día comparten un analito con valores distintos (p. ej. dos potasios), ya no se mezclan en una sola.',
  },
  {
    title: 'Hora de labs fusionados correcta',
    body: 'Un set con varios reportes ya no pierde la hora que tenía guardada.',
  },
  {
    title: 'Panel de electrolitos completo',
    body: 'Si falta el sodio pero hay otros electrolitos, el panel ya no desaparece por completo.',
  },
  {
    title: 'Telemetría anónima de actualización',
    body: 'Ahora viene activada: al actualizar solo se envía versión, resultado y sistema. Nunca datos clínicos. Se desactiva en Ajustes.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_841;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.4.1': RELEASE_NOTES_841,
};
