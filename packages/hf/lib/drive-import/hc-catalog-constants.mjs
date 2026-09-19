/** Drive-import HC catalog constants (formerly lib/historia-clinica). */

export const APP_DEDICATED_IDS = new Set([
  'cirugias',
  'transfusiones',
  'traumaticos',
  'alergias',
]);

/** @type {Array<{ id: string, label: string, group?: string }>} */
export const AHF_RELATIVES = [
  { id: 'madre', label: 'Madre', group: 'padres' },
  { id: 'padre', label: 'Padre', group: 'padres' },
  { id: 'abuela_paterna', label: 'Abuela paterna', group: 'abuelos' },
  { id: 'abuelo_paterno', label: 'Abuelo paterno', group: 'abuelos' },
  { id: 'abuela_materna', label: 'Abuela materna', group: 'abuelos' },
  { id: 'abuelo_materno', label: 'Abuelo materno', group: 'abuelos' },
  { id: 'hermano', label: 'Hermano', group: 'hermanos' },
  { id: 'hermana', label: 'Hermana', group: 'hermanos' },
  { id: 'hijo', label: 'Hijo', group: 'hijos' },
  { id: 'hija', label: 'Hija', group: 'hijos' },
];
