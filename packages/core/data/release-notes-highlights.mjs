/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_858 = [
  {
    title: 'Toma previa a la vista',
    body: 'Cada lab muestra <strong>el valor anterior</strong> antes de la flecha.',
  },
  {
    title: 'Copiar cálculos',
    body: 'Nuevo interruptor para incluir <strong>eTFG, cCa, BUN/CR, RetC y AG</strong> al copiar. Viene apagado.',
  },
  {
    title: 'Cultivos en tarjetas',
    body: 'Sitio, fecha, estado y <strong>antibióticos</strong> en etiquetas, en Labs y en Resumen.',
  },
  {
    title: 'Cultivos mejor leídos',
    body: 'El reporte pegado <strong>se interpreta mejor</strong>. ATB y Cuenta quedan en su tarjeta.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_858;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.8': RELEASE_NOTES_858,
};
