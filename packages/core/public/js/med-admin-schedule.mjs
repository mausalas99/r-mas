import { normalizeFrecuencia } from './med-receta-nombre.mjs';
import { isPrnMedicationItem } from './med-receta-format.mjs';

/** @typedef {'scheduled'|'once'|'prn'|'unscheduled'} MedAdminScheduleKind */

/**
 * Horas por defecto para N tomas/día, repartidas cada `intervalHours` desde
 * un ancla de 06:00 (primer pase de enfermería habitual). Editable por toma
 * en el registro real; esto solo fija el punto de partida.
 * @param {number} intervalHours
 * @returns {string[]}
 */
function evenlySpacedTimes(intervalHours) {
  var slots = Math.max(1, Math.round(24 / intervalHours));
  var times = [];
  for (var i = 0; i < slots; i += 1) {
    var h = (6 + i * intervalHours) % 24;
    times.push(String(h).padStart(2, '0') + ':00');
  }
  return times;
}

/**
 * Expande la frecuencia de una indicación (frecuenciaRaw) en las tomas
 * esperadas del día, para poder verificar cada una por separado.
 * @param {{ frecuenciaRaw?: string, dosisRaw?: string }|null|undefined} item
 * @returns {{ kind: MedAdminScheduleKind, defaultTimes: string[] }}
 */
export function medAdminScheduleForItem(item) {
  if (!item) return { kind: 'unscheduled', defaultTimes: ['08:00'] };
  if (isPrnMedicationItem(item)) return { kind: 'prn', defaultTimes: [] };
  var fr = normalizeFrecuencia(item.frecuenciaRaw).toUpperCase();
  if (fr === 'UNICA VEZ' || fr === 'ÚNICA VEZ') return { kind: 'once', defaultTimes: ['08:00'] };
  var everyHours = fr.match(/CADA\s+(\d+)\s+HORAS?/);
  if (everyHours) return { kind: 'scheduled', defaultTimes: evenlySpacedTimes(Number(everyHours[1])) };
  if (fr === 'POR TURNO') return { kind: 'scheduled', defaultTimes: evenlySpacedTimes(8) };
  return { kind: 'unscheduled', defaultTimes: ['08:00'] };
}
