import { trimStr } from './med-receta-util.mjs';
import { getMedCatalogSoapTokens } from './med-receta-catalog.mjs';
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';
import { isPrnMedicationItem } from './med-receta-format.mjs';
import { isInsulinRescateMedicationItem } from './insulin-rescate-detect.mjs';
import { isNutritionMedicationItem } from './med-receta-diet.mjs';
import { isApoyoMedicationNombre } from './med-receta-apoyo.mjs';
import {
  isInhaledRouteMed_,
  isRacemicEpinephrine_,
  classifyVasopressors_,
  classifyAbx_,
  classifyAnalgesia_,
  classifyAntiemeticos_,
  classifyDiureticos_,
  classifyAntitromboticos_,
  classifyAnticoagulacion_,
  classifyEstatinas_,
  classifyViaAerea_,
  classifySedacion_,
  classifyAntiepilepticos_,
  classifyAntiparkinsonianos_,
  classifyAntidotos_,
  classifyAntiarritmicos_,
  classifyTransfusiones_,
  classifyNmDiabetesThyroidPpi_,
  classifyNmSupport_,
  classifyAntihta_,
} from './med-receta-soap-families.mjs';
import { classifyBySomeCatalog, isSuerosMedicationNombre } from './med-receta-soap-some-map.mjs';

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function overlayTokensMatch(nNorm, tokens) {
  if (!tokens || !tokens.length) return false;
  var parts = [];
  for (var i = 0; i < tokens.length; i += 1) {
    var x = normalizeNombreForSoapClassify(tokens[i]);
    if (x) parts.push(escapeRegExp(x));
  }
  if (!parts.length) return false;
  return new RegExp('\\b(' + parts.join('|') + ')\\b').test(nNorm);
}

function extractMgDoseFromMedBlob(blob) {
  var m = String(blob || '').match(/\b(\d+(?:[.,]\d+)?)\s*MG\b/);
  if (!m) return null;
  var v = parseFloat(String(m[1]).replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function isAspirinNombre(n) {
  return /\b(ACETILSALICILICO|ACIDO\s+ACETILSALICILICO|ACIDO\s+ACETIL\s+SALICILICO|ASPIRINA)\b/.test(
    n
  );
}

/** Destinos SOAP asignables manualmente (corregir auto-clasificación o «otros»). */
export const SOAP_DESTINATION_GROUPS = [
  {
    label: 'N',
    keys: ['analgesia', 'antiemeticos', 'sedacion', 'antiepilepticos', 'antiparkinsonianos', 'antidotos'],
  },
  { label: 'V', keys: ['viaAerea'] },
  {
    label: 'HD',
    keys: [
      'vasop',
      'antihta',
      'antitromboticos',
      'anticoagulacion',
      'antiarritmicos',
      'diuretico',
      'estatinas',
    ],
  },
  { label: 'HI', keys: ['abx', 'transfusiones'] },
  { label: 'NM', keys: ['nm'] },
];

export const SOAP_DESTINATION_KEYS = SOAP_DESTINATION_GROUPS.reduce(function (acc, g) {
  return acc.concat(g.keys);
}, []);

export const SOAP_DESTINATION_LABELS = {
  analgesia: 'Analgésicos / antipiréticos',
  antiemeticos: 'Antieméticos',
  sedacion: 'Sedación / delirium',
  antiepilepticos: 'Antiepilépticos',
  antiparkinsonianos: 'Antiparkinsonianos',
  antidotos: 'Antídotos',
  viaAerea: 'Vía aérea (broncodilatadores / mucolíticos)',
  antihta: 'Antihipertensivos',
  diuretico: 'Diuréticos',
  antitromboticos: 'Tromboprofilaxis / antiagregación',
  anticoagulacion: 'Anticoagulación terapéutica',
  antiarritmicos: 'Antiarrítmicos',
  estatinas: 'Estatinas',
  abx: 'Antibióticos / antifúngicos',
  transfusiones: 'Transfusiones / hemoderivados',
  vasop: 'Vasopresores / inotrópicos',
  nm: 'NM (soporte, crónicos, etc.)',
};

/**
 * @param {string} soapKey
 * @returns {string}
 */
export function mapSoapDestKeyToEaField(soapKey) {
  return soapKey === 'diuretico' ? 'diureticos' : soapKey;
}

/**
 * Options HTML grouped by SOAP zone (N / V / HD / HI / NM).
 * @param {(s: string) => string} escFn
 * @param {{
 *   current?: string,
 *   emptyLabel?: string,
 *   omitEmpty?: boolean,
 *   excludeKey?: string,
 *   includeKeys?: string[],
 *   mapKey?: (k: string) => string,
 *   labels?: Record<string, string>,
 * }} [opts]
 * @returns {string}
 */
export function soapDestinationSelectOptionsHtml(escFn, opts) {
  opts = opts || {};
  var current = opts.current || '';
  var labels = opts.labels || SOAP_DESTINATION_LABELS;
  var mapKey =
    opts.mapKey ||
    function (k) {
      return k;
    };
  var include = null;
  if (opts.includeKeys && opts.includeKeys.length) {
    include = {};
    opts.includeKeys.forEach(function (k) {
      include[k] = true;
    });
  }
  var html = '';
  if (!opts.omitEmpty) {
    html += '<option value="">' + escFn(opts.emptyLabel || 'Elegir destino…') + '</option>';
  }
  SOAP_DESTINATION_GROUPS.forEach(function (g) {
    var inner = '';
    g.keys.forEach(function (soapKey) {
      var k = mapKey(soapKey);
      if (opts.excludeKey && k === opts.excludeKey) return;
      if (include && !include[k]) return;
      var sel = current === k ? ' selected' : '';
      inner +=
        '<option value="' +
        escFn(k) +
        '"' +
        sel +
        '>' +
        escFn(labels[k] || labels[soapKey] || k) +
        '</option>';
    });
    if (!inner) return;
    html += '<optgroup label="' + escFn(g.label) + '">' + inner + '</optgroup>';
  });
  return html;
}

/**
 * Categoría efectiva para volcar a SOAP: override manual gana sobre auto-clasificación.
 * @param {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, viaRaw?: string, soapCatOverride?: string }} item
 * @param {(nombreRaw: string, dosisRaw?: string, frecuenciaRaw?: string, viaRaw?: string) => string} classifyFn
 */
export function effectiveSoapCategory(item, classifyFn) {
  if (!item) return 'otros';
  var ov = trimStr(item.soapCatOverride);
  if (ov && SOAP_DESTINATION_KEYS.indexOf(ov) >= 0) return ov;
  return classifyFn(item.nombreRaw, item.dosisRaw, item.frecuenciaRaw, item.viaRaw);
}

/**
 * Valor del selector «Destino» en Manejo (vacío si auto=otros sin override).
 * @param {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, viaRaw?: string, soapCatOverride?: string }} item
 * @param {(nombreRaw: string, dosisRaw?: string, frecuenciaRaw?: string, viaRaw?: string) => string} classifyFn
 */
export function soapDestinationUiValue(item, classifyFn) {
  if (!item) return '';
  var ov = trimStr(item.soapCatOverride);
  if (ov && SOAP_DESTINATION_KEYS.indexOf(ov) >= 0) return ov;
  var auto = classifyFn(item.nombreRaw, item.dosisRaw, item.frecuenciaRaw, item.viaRaw);
  return auto !== 'otros' ? auto : '';
}

/**
 * Medicamentos «otros» marcados SOAP sin destino asignado.
 * @param {unknown[]} items
 * @param {Record<string, boolean>} selMap
 * @param {(nombreRaw: string) => string} classifyFn
 */
export function unassignedOtrosSoapItems(items, selMap, classifyFn) {
  var out = [];
  var list = Array.isArray(items) ? items : [];
  list.forEach(function (it) {
    if (!it || !selMap[it.id] || it.suspendido) return;
    if (effectiveSoapCategory(it, classifyFn) === 'otros') out.push(it);
  });
  return out;
}

/**
 * Clasificación automática para campos SOAP / Estado Actual (sin override manual).
 * @param {string} [dosisRaw] — opcional; desambigua dosis (p. ej. AAS 100 mg antiplaquetario vs 500 mg analgésico).
 */
function classifyByCatalogTokens_(n, o) {
  if (overlayTokensMatch(n, o.vasop)) return 'vasop';
  if (overlayTokensMatch(n, o.abx)) return 'abx';
  if (overlayTokensMatch(n, o.analgesia)) return 'analgesia';
  if (overlayTokensMatch(n, o.antihta)) return 'antihta';
  return '';
}

const NAME_HEURISTIC_CLASSIFIERS = [
  [classifyAbx_, 'abx'],
  [classifyTransfusiones_, 'transfusiones'],
  [classifyAnalgesia_, 'analgesia'],
  [classifyAntiemeticos_, 'antiemeticos'],
  [classifyDiureticos_, 'diuretico'],
  [classifyAnticoagulacion_, 'anticoagulacion'],
  [classifyAntitromboticos_, 'antitromboticos'],
  [classifyEstatinas_, 'estatinas'],
  [classifyAntiarritmicos_, 'antiarritmicos'],
  [classifyViaAerea_, 'viaAerea'],
  [classifyVasopressors_, 'vasop'],
  [classifySedacion_, 'sedacion'],
  [classifyAntiepilepticos_, 'antiepilepticos'],
  [classifyAntiparkinsonianos_, 'antiparkinsonianos'],
  [classifyAntidotos_, 'antidotos'],
  [classifyNmSupport_, 'nm'],
  [classifyNmDiabetesThyroidPpi_, 'nm'],
  [classifyAntihta_, 'antihta'],
];

function classifyByNameHeuristics_(n) {
  for (var i = 0; i < NAME_HEURISTIC_CLASSIFIERS.length; i++) {
    var pair = NAME_HEURISTIC_CLASSIFIERS[i];
    if (pair[0](n)) return pair[1];
  }
  return '';
}

/**
 * D50 no va al SOAP. PRN solo en analgesia, salvo rescates de insulina por glucometría (SOME).
 */
export function shouldIncludeMedicationInSoap(item, classifyFn) {
  if (!item || item.suspendido) return false;
  if (isNutritionMedicationItem(item)) return false;
  if (isApoyoMedicationNombre(item.nombreRaw)) return false;
  if (isSuerosMedicationNombre(item.nombreRaw)) return false;
  var blob = normalizeNombreForSoapClassify(
    [item.nombreRaw, item.dosisRaw, item.frecuenciaRaw].filter(Boolean).join(' ')
  );
  if (/\bDEXTROSA\s*50\b/.test(blob)) return false;
  if (isInsulinRescateMedicationItem(item)) return true;
  if (isPrnMedicationItem(item)) {
    var classify = classifyFn || classifyMedicationSoapCategory;
    return classify(item.nombreRaw, item.dosisRaw) === 'analgesia';
  }
  return true;
}

export function classifyMedicationSoapCategory(nombreRaw, dosisRaw, frecuenciaRaw, viaRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  var classifyBlob = normalizeNombreForSoapClassify(
    [nombreRaw, dosisRaw, frecuenciaRaw, viaRaw].filter(Boolean).join(' ')
  );
  if (isAspirinNombre(n)) {
    var mg = extractMgDoseFromMedBlob(classifyBlob);
    if (mg == null || mg <= 160) return 'antitromboticos';
    return 'analgesia';
  }
  if (isRacemicEpinephrine_(classifyBlob)) return 'viaAerea';
  if (isInhaledRouteMed_(classifyBlob) && /\b(EPINEFRINA|ADRENALINA)\b/.test(classifyBlob)) {
    return 'viaAerea';
  }
  var fromCatalog = classifyByCatalogTokens_(n, getMedCatalogSoapTokens());
  if (fromCatalog === 'vasop' && (isRacemicEpinephrine_(classifyBlob) || isInhaledRouteMed_(classifyBlob))) {
    return 'viaAerea';
  }
  if (fromCatalog) return fromCatalog;
  var fromHeuristic = classifyByNameHeuristics_(classifyBlob);
  if (fromHeuristic) return fromHeuristic;
  var fromSome = classifyBySomeCatalog(n) || classifyBySomeCatalog(classifyBlob);
  if (fromSome) return fromSome;
  return 'otros';
}
