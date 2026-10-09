/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_850 = [
  {
    title: 'Sugerencias de interconsulta',
    body: 'Pega un texto <strong>«SUGERENCIAS POR …»</strong> y R+ lo pasa a las Indicaciones del paciente abierto, cada apartado en su casilla.',
  },
  {
    title: 'Turno en curso',
    body: 'En Estado actual, la pastilla <strong>Turno en curso</strong> guarda el registro que cierra esta noche. Se ve como de hoy y el balance lo cuenta a medianoche.',
  },
  {
    title: 'Motivo de IC en las tarjetas',
    body: 'Las tarjetas grandes muestran el <strong>Motivo de IC</strong>. «Grupo» y «Seguimiento» ahora son un solo control.',
  },
  {
    title: 'La nota llega al equipo',
    body: 'Pegar labs, <strong>Enviar labs</strong> y <strong>Añadir a Tratamiento</strong> ahora sincronizan la nota por Nube con tu equipo.',
  },
  {
    title: 'Cambio de paciente más rápido',
    body: 'Se quitó una espera al hacer clic. Pasar de un paciente a otro se siente inmediato.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_850;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.0': RELEASE_NOTES_850,
};
