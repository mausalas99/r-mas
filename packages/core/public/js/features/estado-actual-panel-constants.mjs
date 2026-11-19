/** Vital keys and labels shared across Estado Actual panel modules. */

/** @type {readonly string[]} */
export const VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/** @type {Record<string, string>} */
export const VITAL_LABELS = {
  tas: 'TAS',
  tad: 'TAD',
  fc: 'FC',
  fr: 'FR',
  temp: 'Temp',
  sat: 'Saturación',
};

/** @type {Record<string, string>} */
export const VITAL_UNITS = {
  tas: 'mmHg',
  tad: 'mmHg',
  fc: 'lpm',
  fr: 'rpm',
  temp: '°C',
  sat: '%',
};

/** Nivel de alerta values stored in `ec.alerta`; empty means ALERTA. */
export const NEURO_ALERTA = ['ALERTA', 'SOMNOLIENTO', 'ESTUPOROSO', 'COMA'];

/** Esferas: letter stored in `ec.orient` when the patient is oriented in it, and its label. */
export const NEURO_ESFERAS = [['T', 'Tiempo'], ['L', 'Lugar'], ['P', 'Persona']];

/** @type {readonly string[]} */
export const SOPORTE_OPTIONS = [
  'Aire ambiente',
  'Puntillas nasales',
  'Mascarilla simple',
  'Mascarilla reservorio',
  'Alto flujo',
  'VMNI',
  'Ventilación mecánica',
  'Traqueostomía',
];
