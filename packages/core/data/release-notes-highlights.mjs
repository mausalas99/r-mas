/**
 * Curated in-app "what's new" highlights for the current release only (data
 * only). Onboarding covers history for new/returning users — this file is
 * not an archive, it exists to be overwritten wholesale on every bump.
 */

var RELEASE_NOTES_852 = [
  {
    title: 'Coagulación corregida',
    body: 'R+ lee <strong>TP, TTP e INR corregidos</strong> del reporte y los muestra junto a los valores sin corregir. También entran a Tendencias.',
  },
  {
    title: 'Pestañas con resorte',
    body: 'La línea de la pestaña activa se desliza al nuevo lugar, en lugar de saltar.',
  },
  {
    title: 'Ventanas más suaves',
    body: 'Las ventanas abren y cierran con un resorte corto.',
  },
  {
    title: 'Interruptores con peso',
    body: 'Puedes arrastrar la perilla de un interruptor, y se asienta con un pequeño rebote.',
  },
  {
    title: 'Tarjetas de Tendencias',
    body: 'Al arrastrar una tarjeta, las demás se acomodan con suavidad. Con movimiento reducido no hay animación.',
  },
];

export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_852;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.5.2': RELEASE_NOTES_852,
};
