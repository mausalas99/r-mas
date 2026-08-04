import {
  isInsulinRescateMedicationItem,
  INSULIN_RESCATE_NM_LABEL,
} from './insulin-rescate-display.mjs';
import { isNutritionMedicationItem } from './med-receta-diet.mjs';

function medTitle(nombreRaw) {
  var s = String(nombreRaw || '').trim();
  if (!s) return '';
  s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
  var chunk = (s.split(/\s+(?=\d)/)[0] || '').trim();
  return (chunk || s).slice(0, 80).toUpperCase();
}

function formatDia(diaTratamiento) {
  if (diaTratamiento == null || diaTratamiento === '') return '';
  var n = Number(diaTratamiento);
  if (!Number.isFinite(n) || n < 0) return '';
  return 'Día ' + String(Math.floor(n));
}

/**
 * Censo ATB/Meds: rescates agrupados, luego nombre + día de tratamiento.
 * Dieta / nutrición se omiten (no van en esta columna).
 * @param {{ items?: Array<Record<string, unknown>>, dietas?: unknown[] }|null|undefined} block
 * @returns {string}
 */
export function formatCensoMedsFromReceta(block) {
  if (!block) return '';
  var lines = [];
  var items = Array.isArray(block.items) ? block.items : [];
  var rescateAdded = false;
  items.forEach(function (it) {
    if (!it || it.suspendido) return;
    if (isNutritionMedicationItem(it)) return;
    if (isInsulinRescateMedicationItem(it)) {
      if (!rescateAdded) {
        lines.push(INSULIN_RESCATE_NM_LABEL);
        rescateAdded = true;
      }
      return;
    }
    var name = medTitle(it.nombreRaw);
    if (!name) return;
    var dia = formatDia(it.diaTratamiento);
    lines.push(dia ? name + ' · ' + dia : name);
  });
  return lines.join('\n');
}
