import {
  isInsulinRescateMedicationItem,
  INSULIN_RESCATE_NM_LABEL,
} from './insulin-rescate-display.mjs';
import {
  isNutritionMedicationItem,
  mergeDietaItems,
  collectDietasFromRecetaBlock,
} from './med-receta-diet.mjs';

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

function normalizeDietDesc(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[*•-]+\s*/g, '')
    .toUpperCase()
    .replace(/^DIETA\s+/, '');
}

function isSuplementoDietDesc(desc) {
  if (!desc) return false;
  if (desc === 'SUPLEMENTO' || desc.startsWith('SUPLEMENTO')) return true;
  return /\bALIMENTACI[OÓ]N\b/.test(desc) && /\bSUPLEMENTO\b/.test(desc);
}

/**
 * @param {{ items?: Array<Record<string, unknown>>, dietas?: unknown[] }|null|undefined} block
 * @returns {string}
 */
function formatCensoDietLine(block) {
  var merged = mergeDietaItems(collectDietasFromRecetaBlock(block));
  var desc = normalizeDietDesc(merged && merged.descripcion);
  if (!desc) return '';
  if (isSuplementoDietDesc(desc)) return 'DIETA SUPLEMENTO';
  return 'DIETA ' + desc.slice(0, 60);
}

/**
 * Censo: dieta (si hay), rescates agrupados, luego nombre + día de tratamiento.
 * @param {{ items?: Array<Record<string, unknown>>, dietas?: unknown[] }|null|undefined} block
 * @returns {string}
 */
export function formatCensoMedsFromReceta(block) {
  if (!block) return '';
  var lines = [];
  var dietLine = formatCensoDietLine(block);
  if (dietLine) lines.push(dietLine);

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
