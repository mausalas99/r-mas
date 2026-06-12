import {
  effectiveSoapCategory,
  formatMedicationSoapShort,
  advanceAbxMedTextForManejoDate,
} from '../med-receta-core.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';

/**
 * @param {string | null | undefined} activeId
 * @param {Record<string, { fechaActualizacion?: string }>} [medRecetaByPatient]
 */
export function resolveManejoFechaActualizacion(activeId, medRecetaByPatient) {
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  return block && block.fechaActualizacion ? String(block.fechaActualizacion).trim() : '';
}

/**
 * @param {string} text
 * @param {string | null | undefined} fechaActualizacion
 * @param {Date} [refDate]
 */
function advanceAbxTextForEa(text, fechaActualizacion, refDate) {
  if (!text || !fechaActualizacion) return text;
  return advanceAbxMedTextForManejoDate(String(text), fechaActualizacion, refDate);
}

/**
 * @param {Record<string, unknown>} ec
 * @param {string} fechaActualizacion
 * @param {Date} [refDate]
 */
function withAdvancedAbxEc(ec, fechaActualizacion, refDate) {
  if (!fechaActualizacion || !ec || !ec.abx || !String(ec.abx).trim()) return ec;
  var next = Object.assign({}, ec);
  next.abx = advanceAbxTextForEa(String(ec.abx), fechaActualizacion, refDate);
  return next;
}

export const DIET_PENDING_KEYS = /** @type {const} */ (['dieta', 'kcal', 'proteinG']);

/**
 * @param {Record<string, unknown> | null | undefined} pendienteReceta
 * @returns {boolean}
 */
export function hasPendingEaProposals(pendienteReceta) {
  var pend = pendienteReceta && typeof pendienteReceta === 'object' ? pendienteReceta : {};
  if (
    DIET_PENDING_KEYS.some(function (k) {
      return pend[k] && String(pend[k]).trim();
    })
  ) {
    return true;
  }
  return MED_FIELD_KEYS.some(function (k) {
    return pend[k] && String(pend[k]).trim();
  });
}

/**
 * Estado clínico efectivo para texto SOAP: incluye propuestas pendientes no confirmadas.
 * @param {Record<string, unknown> | null | undefined} monitoreo
 * @returns {Record<string, unknown>}
 */
function mergePendingDietProposal(ec, pend, conf) {
  if (!ec || typeof ec !== 'object') return ec;
  if (conf && conf.dieta) return ec;
  var hasPend = DIET_PENDING_KEYS.some(function (k) {
    return pend[k] && String(pend[k]).trim();
  });
  if (!hasPend) return ec;
  DIET_PENDING_KEYS.forEach(function (k) {
    var pending = pend[k];
    if (pending != null && String(pending).trim()) ec[k] = String(pending).trim();
  });
  return ec;
}

/**
 * Estado clínico para inputs del panel EA (incluye propuesta de dieta pendiente).
 * @param {Record<string, unknown> | null | undefined} monitoreo
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function estadoClinicoForDisplay(monitoreo, opts) {
  if (!monitoreo || typeof monitoreo !== 'object') return {};
  var fechaActualizacion = opts && opts.fechaActualizacion ? String(opts.fechaActualizacion).trim() : '';
  var refDate = opts && opts.refDate;
  var ec =
    monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object'
      ? Object.assign({}, monitoreo.estadoClinico)
      : {};
  var pend =
    monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
      ? monitoreo.pendienteReceta
      : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  mergePendingDietProposal(ec, pend, conf);
  return withAdvancedAbxEc(ec, fechaActualizacion, refDate);
}

/**
 * @param {Record<string, unknown> | null | undefined} monitoreo
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function estadoClinicoForText(monitoreo, opts) {
  if (!monitoreo || typeof monitoreo !== 'object') return {};
  var fechaActualizacion = opts && opts.fechaActualizacion ? String(opts.fechaActualizacion).trim() : '';
  var refDate = opts && opts.refDate;
  var ec = estadoClinicoForDisplay(monitoreo, opts);
  var pend =
    monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
      ? monitoreo.pendienteReceta
      : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  for (var k of MED_FIELD_KEYS) {
    if (conf[k]) continue;
    var pending = pend[k];
    if (pending == null || !String(pending).trim()) continue;
    if (!ec[k] || !String(ec[k]).trim()) {
      var val = String(pending).trim();
      ec[k] = k === 'abx' ? advanceAbxTextForEa(val, fechaActualizacion, refDate) : val;
    }
  }
  return ec;
}

/**
 * Aplica propuestas desde medicamentos marcados SOAP en la pestaña Receta.
 * @param {string | null | undefined} patientId
 * @param {Record<string, unknown>} monitoreo
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 * @param {Record<string, Record<string, boolean>>} medNotaSelectionByPatient
 * @param {(nombreRaw: string) => string} classifyFn
 * @returns {boolean} true si se aplicó al menos una propuesta
 */
export function syncRecetaProposalsFromSoapSelection(
  patientId,
  monitoreo,
  medRecetaByPatient,
  medNotaSelectionByPatient,
  classifyFn
) {
  if (!patientId || !monitoreo) return false;
  var block = medRecetaByPatient ? medRecetaByPatient[patientId] : null;
  var sel = medNotaSelectionByPatient && medNotaSelectionByPatient[patientId];
  var buckets = bucketsFromRecetaItems(block ? block.items : [], sel || {}, classifyFn);
  var hasAny = MED_FIELD_KEYS.some(function (k) {
    return buckets[k] && String(buckets[k]).trim();
  });
  if (!hasAny) return false;
  applyRecetaProposal(monitoreo, buckets);
  return true;
}

/**
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} it
 * @returns {string}
 */
export function medInstructionFragmentForSoap(it) {
  return formatMedicationSoapShort(it);
}

/**
 * @param {unknown[]} items
 * @param {Record<string, boolean>} selMap
 * @param {(nombreRaw: string) => string} classifyFn
 * @returns {Record<string, string>}
 */
export function bucketsFromRecetaItems(items, selMap, classifyFn) {
  /** @type {Record<string, string[]>} */
  var arrays = {
    analgesia: [],
    abx: [],
    antihta: [],
    diuretico: [],
    antitromboticos: [],
    vasop: [],
    nm: [],
    otros: [],
  };
  var list = Array.isArray(items) ? items : [];
  list.forEach(function (it) {
    if (!it || !selMap[it.id] || it.suspendido) return;
    var cat = effectiveSoapCategory(it, classifyFn);
    if (cat === 'otros') return;
    if (arrays[cat]) arrays[cat].push(medInstructionFragmentForSoap(it));
    else arrays.otros.push(medInstructionFragmentForSoap(it));
  });
  /** @type {Record<string, string>} */
  var buckets = {};
  for (var k of MED_FIELD_KEYS) {
    var srcKey = k === 'diureticos' ? 'diuretico' : k;
    buckets[k] = (arrays[srcKey] || []).join(' | ');
  }
  return buckets;
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {Record<string, string>} buckets
 */
export function applyRecetaProposal(monitoreo, buckets) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = {};
  }
  for (var k of MED_FIELD_KEYS) {
    if (monitoreo.confirmado && monitoreo.confirmado[k]) continue;
    var val = buckets && buckets[k];
    if (val != null && String(val).trim()) {
      monitoreo.pendienteReceta[k] = String(val).trim();
    }
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string} key
 */
export function confirmMedField(monitoreo, key) {
  if (!monitoreo || !MED_FIELD_KEYS.includes(/** @type {typeof MED_FIELD_KEYS[number]} */ (key))) return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  var pending =
    monitoreo.pendienteReceta &&
    typeof monitoreo.pendienteReceta === 'object' &&
    monitoreo.pendienteReceta[key];
  if (pending != null && String(pending).trim()) {
    /** @type {Record<string, string>} */ (monitoreo.estadoClinico)[key] = String(pending).trim();
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado)[key] = true;
  if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object') {
    monitoreo.pendienteReceta[key] = '';
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string} key
 */
export function discardMedProposal(monitoreo, key) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  if (MED_FIELD_KEYS.includes(/** @type {typeof MED_FIELD_KEYS[number]} */ (key))) {
    monitoreo.pendienteReceta[key] = '';
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 */
export function confirmDietProposal(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  DIET_PENDING_KEYS.forEach(function (k) {
    var pending = monitoreo.pendienteReceta[k];
    if (pending != null && String(pending).trim()) {
      /** @type {Record<string, string>} */ (monitoreo.estadoClinico)[k] = String(pending).trim();
      monitoreo.pendienteReceta[k] = '';
    }
  });
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado).dieta = true;
}

export function discardDietProposal(monitoreo) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  DIET_PENDING_KEYS.forEach(function (k) {
    monitoreo.pendienteReceta[k] = '';
  });
}

export function confirmAllMedProposals(monitoreo) {
  if (
    DIET_PENDING_KEYS.some(function (k) {
      return (
        monitoreo.pendienteReceta &&
        typeof monitoreo.pendienteReceta === 'object' &&
        monitoreo.pendienteReceta[k] &&
        String(monitoreo.pendienteReceta[k]).trim()
      );
    })
  ) {
    confirmDietProposal(monitoreo);
  }
  for (var k of MED_FIELD_KEYS) {
    if (
      monitoreo.pendienteReceta &&
      typeof monitoreo.pendienteReceta === 'object' &&
      monitoreo.pendienteReceta[k]
    ) {
      confirmMedField(monitoreo, k);
    }
  }
}

/**
 * @param {string | null | undefined} activeId
 * @param {string} category
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 * @param {(nombreRaw: string) => string} classifyFn
 * @returns {Array<{ value: string, label: string }>}
 */
export function buildMedDropdownOptions(activeId, category, medRecetaByPatient, classifyFn) {
  /** @type {Array<{ value: string, label: string }>} */
  var options = [];
  var seen = Object.create(null);
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fecha = category === 'abx' ? resolveManejoFechaActualizacion(activeId, medRecetaByPatient) : '';

  items.forEach(function (it) {
    if (!it || /** @type {{ suspendido?: boolean }} */ (it).suspendido) return;
    var cat = effectiveSoapCategory(
      /** @type {{ nombreRaw?: string, soapCatOverride?: string }} */ (it),
      classifyFn
    );
    var matchCat = cat === category || (category === 'diureticos' && cat === 'diuretico');
    if (!matchCat) return;
    var value = medInstructionFragmentForSoap(/** @type {Parameters<typeof medInstructionFragmentForSoap>[0]} */ (it));
    if (!value || seen[value]) return;
    seen[value] = 1;
    var label =
      category === 'abx' && fecha
        ? formatMedicationSoapShort(
            /** @type {Parameters<typeof formatMedicationSoapShort>[0]} */ (it),
            { fechaActualizacion: fecha }
          )
        : value;
    options.push({ value: value, label: label });
  });

  return options;
}
