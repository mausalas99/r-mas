/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_855 = [
  {
    title: 'Labs de 3 días',
    body: 'El censo PDF y la tabla de Guardia muestran los <strong>labs de 3 días</strong>.',
  },
  {
    title: 'Negativo y positivo',
    body: 'Los resultados <strong>NEGATIVO</strong>, <strong>POSITIVO</strong> y <strong>TRAZAS</strong> se ven tal cual, no como «---».',
  },
  {
    title: 'Medicamentos propuestos',
    body: 'En Estado actual confirmas o descartas <strong>un medicamento a la vez</strong>. Los demás siguen pendientes.',
  },
  {
    title: 'Pacientes en una línea',
    body: 'En el tablero del paciente, las zonas marcadas muestran solo su primera línea.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_855;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.5': RELEASE_NOTES_855,
};
