import { getMedCatalogSoapTokens } from './med-receta-catalog.mjs';
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';
import { isPrnMedicationItem } from './med-receta-format.mjs';
import { isInsulinRescateMedicationItem } from './insulin-rescate-detect.mjs';
import { isNutritionMedicationItem } from './med-receta-diet.mjs';
import { isApoyoMedicationNombre } from './med-receta-apoyo.mjs';
import { classifyBySomeCatalog, isSuerosMedicationNombre } from './med-receta-soap-some-map.mjs';
import { trimStr } from './med-receta-util.mjs';

/**
 * Heurísticas de familia medicamentosa para clasificación SOAP.
 * Cada función devuelve la categoría o '' si no aplica.
 */

const VASOPRESSOR_DRUG_RE =
  /\b(NORADRENALINA|NOREPINEFRINA|EPINEFRINA|ADRENALINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|TERLIPRESINA|FENILEFRINA|MILRINONA|DOPEXAMINA|ISOPROTERENOL)\b/;

/** Vía inhalada (nebulización / inhalador) — no vasopresor sistémico. */
function isInhaledRouteMed_(n) {
  return /\b(INHALAD[OA]?|INHALATORIA|INHALATORIO|NEBULIZ)/.test(n);
}

/** Epinefrina racémica: siempre vía aérea (croup / edema laríngeo), no vasopresor. */
function isRacemicEpinephrine_(n) {
  return (
    /\b(EPINEFRINA|ADRENALINA)\s+RACEMIC[OA]?\b/.test(n) ||
    /\bRACEMIC[OA]?\s+(EPINEFRINA|ADRENALINA)\b/.test(n)
  );
}

function classifyVasopressors_(n) {
  if (isRacemicEpinephrine_(n)) return false;
  if (isInhaledRouteMed_(n) && VASOPRESSOR_DRUG_RE.test(n)) return false;
  return VASOPRESSOR_DRUG_RE.test(n);
}

function classifyAbx_(n) {
  return /\b(ERTAPENEM|MEROPENEM|IMIPENEM|CEFTRIAX|CEFEPIME|CEFTAZID|CEFOXIT|CEFUROXI|CEFOTAX|CEFTAROL|CEFACLOR|CEFAZOLINA|PIPERACILINA|TAZOBACTAM|VANCOMICINA|TEICOPLANINA|DALBAVANCINA|ORITAVANCINA|TIGECICLINA|AMIKACINA|GENTAMICINA|TOBRAMICINA|PLAZOMICINA|LEVOFLOX|CIPROFLOX|MOXIFLOX|DELAFLOX|OFLOXACINO|NORFLOXACINO|METRONIDAZOL|LINEZOLID|DAPTOMICINA|AZTREONAM|COLISTINA|POLIMIXINA|CLINDAMICINA|AZITROMICINA|CLARITROMICINA|ERITROMICINA|DOXICICLINA|MINOCICLINA|FOSFOMICINA|NITROFURANTOINA|RIFAMPICINA|RIFAXIMINA|AMPICILINA|SULBACTAM|AMOXICILINA|BENZILPENICILINA|FLUCLOXACIL|PENICILINA|TRIMETOPRIM|SULFAMETOXAZOL|BACTRIM|COTRIMOX|FLUCONAZOL|VORICONAZOL|ITRACONAZOL|POSACONAZOL|ISAVUCONAZOL|ANIDULAFUNGINA|MICAFUNGINA|CASPOFUNGINA|AMFOTERICINA|ACICLOVIR|VALACICLOVIR|GANCICLOVIR|FOSCARNET|OSELTAMIVIR|REMDESIVIR|REM\s*DESIVIR|ALBENDAZOL|IVERMECTINA|NITAZOXANIDA|PRAZIQUANTEL|METRONIDAZOL)\b/.test(
    n
  );
}

function classifyAnalgesia_(n) {
  return /\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|MORFINA|TRAMADOL|IBUPROFENO|NAPROXENO|DICLOFENACO|BUPRENORFINA|FENTANILO|REMIFENTANILO|SUFENTANILO|HIDROMORFONA|OXICODONA|NALBUFINA|PENTAZOCINA|TAPENTADOL|ALFENTANILO|MEPERIDINA|PETIDINA|CODEINA|HIDROCODONA|CELECOXIB|MELOXICAM|DEXKETOPROFENO|PARECOXIB|INDOMETACINA|ETORICOXIB|NIMESULIDA)\b/.test(
    n
  );
}

function classifyAntiemeticos_(n) {
  return /\b(ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA)\b/.test(
    n
  );
}

function classifyDiureticos_(n) {
  return /\b(HIDROCLOROTIAZ|CLORTALIDONA|INDAPAMIDA|FUROSEMIDA|TORASEMIDA|BUMETANIDA|ESPIRONOLACTONA|EPLERENONA|MANITOL|ACETAZOLAMIDA)\b/.test(
    n
  );
}

/** Tromboprofilaxis y antiagregación. */
function classifyAntitromboticos_(n) {
  return /\b(ENOXAPARINA|HEPARINA|DALTEPARINA|TINZAPARINA|FONDAPARINUX|NADROPARINA|CLOPIDOGREL|TICAGRELOR|PRASUGREL|CILOSTAZOL|TICLOPIDINA)\b/.test(
    n
  );
}

/** Anticoagulación terapéutica y trombolíticos. */
function classifyAnticoagulacion_(n) {
  return /\b(WARFARINA|ACENOCUMAROL|APIXABAN|RIVAROXABAN|EDOXABAN|DABIGATRAN|ALTEPLASA|TENECTEPLASA|RETEPLASA|ESTREPTOKINASA|UROKINASA|HEPARINA\s+SODICA|ARGATROBAN|BIVALIRUDINA)\b/.test(
    n
  );
}

function classifyEstatinas_(n) {
  return /\b(ATORVASTATINA|ROSUVASTATINA|PRAVASTATINA|SINVASTATINA|FLUVASTATINA|PITAVASTATINA|LOVASTATINA)\b/.test(
    n
  );
}

function classifyViaAerea_(n) {
  if (isRacemicEpinephrine_(n)) return true;
  if (isInhaledRouteMed_(n) && VASOPRESSOR_DRUG_RE.test(n)) return true;
  return /\b(SALBUTAMOL|LEVOSALBUTAMOL|TERBUTALINA|BUDESONIDA|BECLOMETASONA|FLUTICASONA|TIOTROPIO|IPRATROPIO|FORMOTEROL|SALMETEROL|INDACATEROL|OLODATEROL|GLICOPIRRONIO|UMECLIDINIO|AMBROXOL|BROMHEXINA|GUAIFENESINA|DEXTROMETORFANO)\b/.test(
    n
  );
}

function classifySedacion_(n) {
  return /\b(PROPOFOL|MIDAZOLAM|LORAZEPAM|DIAZEPAM|CLONAZEPAM|HALOPERIDOL|QUETIAPINA|OLANZAPINA|RISPERIDONA|DEXMEDETOMIDINA)\b/.test(
    n
  );
}

function classifyAntiepilepticos_(n) {
  return /\b(LEVETIRACETAM|FENITOINA|CARBAMAZEPINA|VALPROATO|GABAPENTINA|PREGABALINA|FENOBARBITAL|LACOSAMIDA|OXCARBAZEPINA|TOPIRAMATO|LAMOTRIGINA)\b/.test(
    n
  );
}

function classifyAntiparkinsonianos_(n) {
  return /\b(LEVODOPA|CARBIDOPA|BENSERAZIDA|ENTACAPONA|PRAMIPEXOL|ROPINIROL|AMANTADINA|BIPERIDENO|TRIHEXIFENIDILO)\b/.test(
    n
  );
}

function classifyAntidotos_(n) {
  return /\b(NALOXONA|FLUMAZENIL|N-ACETILCISTEINA|ACETILCISTEINA|FISOSTIGMINA|HIDROXICOBALAMINA|DIMERCAPROL)\b/.test(
    n
  );
}

function classifyAntiarritmicos_(n) {
  return /\b(AMIODARONA|LIDOCAINA|DIGOXINA|ADENOSINA|PROPAFENONA|FLECAINIDA|SOTALOL|ESMOLOL|VERAPAMILO|DILTIAZEM)\b/.test(
    n
  );
}

function classifyTransfusiones_(n) {
  return /\b(CONCENTRADO\s+DE\s+ERITROCITOS|CONCENTRADO\s+ERITROCITARIO|PAQUETE\s+GLOBULAR|PLAQUETAS|PLAQUETAFILE|PLASMA\s+FRESCO|PLASMA\s+CONGELADO|CRIOPRECIPITADO|ALBUMINA\s+HUMANA|INMUNOGLOBULINA|HEMODERIVADO|SANGRE\s+TOTAL|TRANSFUSION|TRANSFUSIÓN)\b/.test(
    n
  );
}

function classifyNmDiabetesThyroidPpi_(n) {
  return /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|LEVOTIROXINA|LIOTIRONINA|METFORMINA|REPAGLINIDA|GLIBENCLAMIDA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|SEMAGLUTIDA|LIRAGLUTIDA|DULAGLUTIDA|EXENATIDA)\b/.test(
    n
  );
}

function classifyNmSupport_(n) {
  return /\b(DEXAMETASONA|BETAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|PREDNISON|PREDNISOLONA|DEFLAZACORT|MEPREDNISONA|FOLICO|ACIDO\s+FOLICO|CIANOCOBALAMINA|FERROSO|HIERRO|CLORURO\s+DE\s+POTASIO|FOSFATO\s+DE\s+POTASIO|ACETATO\s+DE\s+POTASIO|SULFATO\s+DE\s+MAGNESIO|GLUCONATO\s+DE\s+CALCIO|LACTULOSA|BISACODILO|SENOSIDOS|POLIETILENGLICOL|MACROGOL|RANITIDINA|FAMOTIDINA|SUCRALFATO|GLUCAGON|DONEPECILO|MEMANTINA|BROMOCRIPTINA|FINASTERIDA|TAMSULOSINA|SOLIFENACINA|OXYBUTININA|TIAMINA|BENFOTIAMINA|PIRIDOXINA|COMPLEJO\s+B|METOTREXATO|AZATIOPRINA|MICOFENOLATO|CICLOSPORINA|TACROLIMUS|CICLOFOSFAMIDA|RITUXIMAB|INFLIXIMAB|ALOPURINOL|COLCHICINA|FEBUXOSTAT|PROBENECID|SERTRALINA|FLUOXETINA|PAROXETINA|ESCITALOPRAM|CITALOPRAM|MIRTAZAPINA|VENLAFAXINA|DULOXETINA|TRAZODONA|AMITRIPTILINA|CICLOBENZAPRINA|BACLOFENO|TIZANIDINA|METOCARBAMOL|ORFENADRINA)\b/.test(
    n
  );
}

function classifyAntihta_(n) {
  return /\b(LOSARTAN|IRBESARTAN|VALSARTAN|TELMISARTAN|OLMESARTAN|CANDESARTAN|ENALAPRIL|LISINOPRIL|RAMIPRIL|CAPTOPRIL|AMLODIPINO|NIFEDIPINO|FELODIPINO|LERCANIDIPINO|CARVEDILOL|METOPROLOL|BISOPROLOL|NEBIVOLOL|PROPRANOLOL|ATENOLOL|LABETALOL|CLONIDINA|HIDRALAZINA|MINOXIDIL|NICARDIPINO|CLEVUDIPINO|DILTIAZEM|VERAPAMILO|NITROGLICERINA|ISOSORBIDE|DINITRATO|SACUBITRIL|NITROPRUSIATO)\b/.test(
    n
  );
}

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
