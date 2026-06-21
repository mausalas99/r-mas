import { trimStr } from './med-receta-util.mjs';
import { getMedCatalogSoapTokens } from './med-receta-catalog.mjs';
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';

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

/** Destinos SOAP asignables manualmente cuando la clasificación automática es «otros». */
export const SOAP_DESTINATION_KEYS = [
  'analgesia',
  'antihta',
  'diuretico',
  'antitromboticos',
  'abx',
  'vasop',
  'nm',
];

export const SOAP_DESTINATION_LABELS = {
  analgesia: 'Analgésicos / antieméticos',
  antihta: 'Antihipertensivos',
  diuretico: 'Diuréticos',
  antitromboticos: 'Antitrombóticos',
  abx: 'Antibióticos / antifúngicos',
  vasop: 'Vasopresores / inotrópicos',
  nm: 'NM (insulina, tiroides, etc.)',
};

/**
 * Categoría efectiva para volcar a SOAP: auto-clasificación o override manual en «otros».
 * @param {{ nombreRaw?: string, soapCatOverride?: string }} item
 * @param {(nombreRaw: string) => string} classifyFn
 */
export function effectiveSoapCategory(item, classifyFn) {
  if (!item) return 'otros';
  var auto = classifyFn(item.nombreRaw, item.dosisRaw);
  if (auto !== 'otros') return auto;
  var ov = trimStr(item.soapCatOverride);
  if (ov && SOAP_DESTINATION_KEYS.indexOf(ov) >= 0) return ov;
  return 'otros';
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

function classifyByNameHeuristics_(n) {
  if (
    /\b(NORADRENALINA|NOREPINEFRINA|EPINEFRINA|ADRENALINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|TERLIPRESINA|FENILEFRINA|MILRINONA|DOPEXAMINA)\b/.test(
      n
    )
  ) {
    return 'vasop';
  }
  if (
    /\b(ERTAPENEM|MEROPENEM|IMIPENEM|CEFTRIAX|CEFEPIME|CEFTAZID|CEFOXIT|CEFUROXI|CEFOTAX|CEFTAROL|CEFACLOR|CEFAZOLINA|PIPERACILINA|TAZOBACTAM|VANCOMICINA|TEICOPLANINA|DALBAVANCINA|ORITAVANCINA|TIGECICLINA|AMIKACINA|GENTAMICINA|TOBRAMICINA|PLAZOMICINA|LEVOFLOX|CIPROFLOX|MOXIFLOX|DELAFLOX|OFLOXACINO|NORFLOXACINO|METRONIDAZOL|LINEZOLID|DAPTOMICINA|AZTREONAM|COLISTINA|POLIMIXINA|CLINDAMICINA|AZITROMICINA|CLARITROMICINA|ERITROMICINA|DOXICICLINA|MINOCICLINA|FOSFOMICINA|NITROFURANTOINA|RIFAMPICINA|RIFAXIMINA|AMPICILINA|SULBACTAM|AMOXICILINA|BENZILPENICILINA|FLUCLOXACIL|PENICILINA|TRIMETOPRIM|SULFAMETOXAZOL|BACTRIM|COTRIMOX|FLUCONAZOL|VORICONAZOL|ITRACONAZOL|POSACONAZOL|ISAVUCONAZOL|ANIDULAFUNGINA|MICAFUNGINA|CASPOFUNGINA|AMFOTERICINA|ACICLOVIR|VALACICLOVIR|GANCICLOVIR|FOSCARNET|OSELTAMIVIR|REMDESIVIR|REM\s*DESIVIR)\b/.test(
      n
    )
  ) {
    return 'abx';
  }
  if (
    /\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|MORFINA|TRAMADOL|IBUPROFENO|NAPROXENO|DICLOFENACO|ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA|BUPRENORFINA|FENTANILO|REMIFENTANILO|SUFENTANILO|HIDROMORFONA|OXICODONA|NALBUFINA|PENTAZOCINA|TAPENTADOL)\b/.test(
      n
    )
  ) {
    return 'analgesia';
  }
  if (
    /\b(HIDROCLOROTIAZ|CLORTALIDONA|INDAPAMIDA|FUROSEMIDA|TORASEMIDA|BUMETANIDA|ESPIRONOLACTONA|EPLERENONA)\b/.test(
      n
    )
  ) {
    return 'diuretico';
  }
  if (
    /\b(ENOXAPARINA|HEPARINA|DALTEPARINA|TINZAPARINA|FONDAPARINUX|NADROPARINA|APIXABAN|RIVAROXABAN|EDOXABAN|DABIGATRAN|WARFARINA|ACENOCUMAROL|CLOPIDOGREL|TICAGRELOR|PRASUGREL|CILOSTAZOL|TICLOPIDINA)\b/.test(
      n
    )
  ) {
    return 'antitromboticos';
  }
  if (
    /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|LEVOTIROXINA|LIOTIRONINA)\b/.test(
      n
    )
  ) {
    return 'nm';
  }
  if (
    /\b(LOSARTAN|IRBESARTAN|VALSARTAN|TELMISARTAN|OLMESARTAN|CANDESARTAN|ENALAPRIL|LISINOPRIL|RAMIPRIL|CAPTOPRIL|AMLODIPINO|NIFEDIPINO|FELODIPINO|LERCANIDIPINO|CARVEDILOL|METOPROLOL|BISOPROLOL|NEBIVOLOL|PROPRANOLOL|ATENOLOL|LABETALOL|ESMOLOL|SOTALOL|CLONIDINA|HIDRALAZINA|MINOXIDIL|NICARDIPINO|CLEVUDIPINO|DILTIAZEM|VERAPAMILO|NITROGLICERINA|ISOSORBIDE|DINITRATO|SACUBITRIL)\b/.test(
      n
    )
  ) {
    return 'antihta';
  }
  return '';
}

function isExplicitOtrosMedication_(n) {
  return /\b(METFORMINA|REPAGLINIDA|GLIBENCLAMIDA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|DEXAMETASONA|BETAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|PREDNISON|PREDNISOLONA|ATORVASTATINA|ROSUVASTATINA|PRAVASTATINA|SINVASTATINA|SALBUTAMOL|LEVOSALBUTAMOL|TERBUTALINA|BUDESONIDA|BECLOMETASONA|FLUTICASONA|TIOTROPIO|IPRATROPIO|FOLICO|CIANOCOBALAMINA|FERROSO|CLORURO\s+DE\s+POTASIO|SULFATO\s+DE\s+MAGNESIO|LACTULOSA|BISACODILO|SENOSIDOS|PROPOFOL|MIDAZOLAM|LORAZEPAM|DIAZEPAM|CLONAZEPAM|HALOPERIDOL|QUETIAPINA|OLANZAPINA|LEVETIRACETAM|FENITOINA|CARBAMAZEPINA|VALPROATO|GABAPENTINA|PREGABALINA|DONEPECILO|MEMANTINA|BROMOCRIPTINA|FINASTERIDA|TAMSULOSINA|SOLIFENACINA|OXYBUTININA)\b/.test(
    n
  );
}

export function classifyMedicationSoapCategory(nombreRaw, dosisRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  var doseBlob = normalizeNombreForSoapClassify([nombreRaw, dosisRaw].filter(Boolean).join(' '));
  if (isAspirinNombre(n)) {
    var mg = extractMgDoseFromMedBlob(doseBlob);
    if (mg == null || mg <= 160) return 'antitromboticos';
    return 'analgesia';
  }
  var fromCatalog = classifyByCatalogTokens_(n, getMedCatalogSoapTokens());
  if (fromCatalog) return fromCatalog;
  var fromHeuristic = classifyByNameHeuristics_(n);
  if (fromHeuristic) return fromHeuristic;
  if (isExplicitOtrosMedication_(n)) return 'otros';
  return 'otros';
}
