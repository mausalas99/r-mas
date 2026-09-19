/**
 * Prune EA med fields when receta SOAP selection changes.
 */
import {
  effectiveSoapCategory,
  advanceAbxMedTextForManejoDate,
} from '../med-receta-core.mjs';
import { shouldIncludeMedicationInSoap } from '../med-receta-soap.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';
import { skipRecetaItemForInsulinPumpCarrier } from '../insulin-pump-receta-display.mjs';
import {
  skipRecetaItemForNmSoapBucket,
} from '../insulin-pump-receta-display.mjs';
import {
  isInsulinRescateMedicationItem,
  patientHasInsulinRescateMeds,
  INSULIN_RESCATE_NM_LABEL,
} from '../insulin-rescate-display.mjs';
import {
  isInsulinPrandialMedicationItem,
  insulinPrandialNmSoapFragment,
} from '../insulin-prandial-display.mjs';
import {
  detectInsulinPumpAlgorithmFromRecetaItems,
  formatInsulinPumpAlgoritmoLabel,
} from '../insulin-pump-some-detect.mjs';
import { medInstructionFragmentForSoap } from './estado-actual-meds-receta-buckets.mjs';

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function parseMedFieldItemsLocal(raw) {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw)
    .split(' | ')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

/**
 * @param {string[]} items
 * @returns {string}
 */
function serializeMedFieldItemsLocal(items) {
  return (items || [])
    .map(function (s) {
      return String(s).trim();
    })
    .filter(Boolean)
    .join(' | ');
}

/**
 * @param {string} text
 */
function normalizeMedSoapLine(text) {
  return String(text || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+DIA\s+\d+\s*$/i, '')
    .replace(/(\d+)\s+G\b/g, '$1G')
    .replace(/(\d+)\s+MG\b/g, '$1MG')
    .replace(/(\d+)\s+MCG\b/g, '$1MCG')
    .trim();
}

/**
 * @param {string} line
 * @param {string[]} allowedFrags
 */
function medSoapLineMatchesReceta(line, allowedFrags) {
  var norm = normalizeMedSoapLine(line);
  if (!norm) return false;
  return allowedFrags.some(function (frag) {
    var f = normalizeMedSoapLine(frag);
    return f && (norm === f || norm.indexOf(f) >= 0 || f.indexOf(norm) >= 0);
  });
}

/**
 * @param {unknown[]} items
 * @param {(nombreRaw: string, dosisRaw?: string) => string} classifyFn
 * @param {string} fechaActualizacion
 * @returns {Record<string, string[]>}
 */
export function allowedSoapFragmentsByCategory(items, classifyFn, fechaActualizacion) {
  /** @type {Record<string, string[]>} */
  var byCat = {};
  MED_FIELD_KEYS.forEach(function (k) {
    byCat[k] = [];
  });
  var list = Array.isArray(items) ? items : [];
  list.forEach(function (it) {
    if (!it || /** @type {{ suspendido?: boolean }} */ (it).suspendido) return;
    if (skipRecetaItemForInsulinPumpCarrier(it, list)) return;
    if (!shouldIncludeMedicationInSoap(
      /** @type {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, suspendido?: boolean }} */ (it),
      classifyFn
    )) {
      return;
    }
    if (isInsulinRescateMedicationItem(it)) return;
    if (isInsulinPrandialMedicationItem(it)) return;
    var cat = effectiveSoapCategory(
      /** @type {{ nombreRaw?: string, soapCatOverride?: string }} */ (it),
      classifyFn
    );
    if (cat === 'otros') return;
    var key = cat === 'diuretico' ? 'diureticos' : cat;
    if (key === 'nm' && skipRecetaItemForNmSoapBucket(it, list)) return;
    var frag = medInstructionFragmentForSoap(
      /** @type {Parameters<typeof medInstructionFragmentForSoap>[0]} */ (it)
    );
    if (key === 'abx' && fechaActualizacion) {
      frag = advanceAbxMedTextForManejoDate(frag, fechaActualizacion);
    }
    if (byCat[key]) byCat[key].push(frag);
  });
  var pumpAlg = detectInsulinPumpAlgorithmFromRecetaItems(list);
  if (pumpAlg != null) {
    var pumpLabel = formatInsulinPumpAlgoritmoLabel(pumpAlg);
    if (pumpLabel && byCat.nm) byCat.nm.push(pumpLabel);
  }
  if (patientHasInsulinRescateMeds(list) && byCat.nm) {
    byCat.nm.push(INSULIN_RESCATE_NM_LABEL);
  }
  var prandialFrag = insulinPrandialNmSoapFragment(list, list);
  if (prandialFrag && byCat.nm) {
    byCat.nm.push(prandialFrag);
  }
  return byCat;
}

/**
 * Quita de EA medicamentos que ya no están en el manejo SOME pegado.
 * @param {Record<string, unknown>} monitoreo
 * @param {unknown[]} items
 * @param {(nombreRaw: string, dosisRaw?: string) => string} classifyFn
 * @param {string} [fechaActualizacion]
 * @returns {boolean}
 */
export function pruneEstadoClinicoMedsFromReceta(monitoreo, items, classifyFn, fechaActualizacion) {
  if (!monitoreo || typeof monitoreo !== 'object') return false;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = {};
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  var allowed = allowedSoapFragmentsByCategory(items, classifyFn, fechaActualizacion || '');
  var changed = false;
  MED_FIELD_KEYS.forEach(function (key) {
    var allowedFrags = allowed[key] || [];
    var ecItems = parseMedFieldItemsLocal(monitoreo.estadoClinico[key]);
    var keptEc = ecItems.filter(function (line) {
      return medSoapLineMatchesReceta(line, allowedFrags);
    });
    if (keptEc.length !== ecItems.length) {
      /** @type {Record<string, string>} */ (monitoreo.estadoClinico)[key] = serializeMedFieldItemsLocal(keptEc);
      changed = true;
    }
    if (!keptEc.length && monitoreo.confirmado[key]) {
      /** @type {Record<string, boolean>} */ (monitoreo.confirmado)[key] = false;
      changed = true;
    }
    var pendVal = monitoreo.pendienteReceta[key];
    if (pendVal != null && String(pendVal).trim()) {
      var pendItems = parseMedFieldItemsLocal(pendVal);
      var keptPend = pendItems.filter(function (line) {
        return medSoapLineMatchesReceta(line, allowedFrags);
      });
      var nextPend = serializeMedFieldItemsLocal(keptPend);
      if (nextPend !== String(pendVal).trim()) {
        monitoreo.pendienteReceta[key] = nextPend;
        changed = true;
      }
    }
  });
  return changed;
}
