import {
  isInsulinRescateMedicationItem,
  INSULIN_RESCATE_NM_LABEL,
} from './insulin-rescate-display.mjs';
import {
  isInsulinPrandialMedicationItem,
  insulinPrandialNmSoapFragment,
} from './insulin-prandial-display.mjs';
import { isNutritionMedicationItem } from './med-receta-diet.mjs';
import { classifyMedicationSoapCategory } from './med-receta-soap.mjs';

/** @param {Record<string, unknown>} item */
function isAntibioticMedicationItem(item) {
  return (
    classifyMedicationSoapCategory(item.nombreRaw, item.dosisRaw, item.frecuenciaRaw, item.viaRaw) === 'abx'
  );
}

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
 * Censo ATB / Meds: separa antibióticos (clasificador SOAP «abx») del resto.
 * Rescates/prandial de insulina van a Meds. Dieta / nutrición se omiten.
 * @param {{ items?: Array<Record<string, unknown>>, dietas?: unknown[] }|null|undefined} block
 * @returns {{ atb: string, meds: string }}
 */
export function splitCensoMedsAtbFromReceta(block) {
  if (!block) return { atb: '', meds: '' };
  var atbLines = [];
  var medsLines = [];
  var items = Array.isArray(block.items) ? block.items : [];
  var rescateAdded = false;
  var prandialAdded = false;
  items.forEach(function (it) {
    if (!it || it.suspendido) return;
    if (isNutritionMedicationItem(it)) return;
    if (isInsulinRescateMedicationItem(it)) {
      if (!rescateAdded) {
        medsLines.push(INSULIN_RESCATE_NM_LABEL);
        rescateAdded = true;
      }
      return;
    }
    if (isInsulinPrandialMedicationItem(it)) {
      if (!prandialAdded) {
        var prandialLine = insulinPrandialNmSoapFragment(items, items);
        if (prandialLine) medsLines.push(prandialLine);
        prandialAdded = true;
      }
      return;
    }
    var name = medTitle(it.nombreRaw);
    if (!name) return;
    var dia = formatDia(it.diaTratamiento);
    // Salto explícito (no ' · ') para que el censo (columna angosta, sin
    // wrap de palabras) muestre "Día N" completo en su propia línea en vez
    // de recortarlo con elipsis.
    var line = dia ? name + '\n' + dia : name;
    (isAntibioticMedicationItem(it) ? atbLines : medsLines).push(line);
  });
  return { atb: atbLines.join('\n'), meds: medsLines.join('\n') };
}

/** @param {{ items?: Array<Record<string, unknown>>, dietas?: unknown[] }|null|undefined} block */
export function formatCensoMedsFromReceta(block) {
  return splitCensoMedsAtbFromReceta(block).meds;
}

/** @param {{ items?: Array<Record<string, unknown>>, dietas?: unknown[] }|null|undefined} block */
export function formatCensoAtbFromReceta(block) {
  return splitCensoMedsAtbFromReceta(block).atb;
}
