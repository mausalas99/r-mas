/**
 * Conversión IV → oral para texto de egreso / SOAP (receta de alta).
 * Solo aplica a bolus o dosis fijas IV con equivalente oral claro; no infusión continua ni fármacos solo IV.
 */
import { trimStr } from './med-receta-util.mjs';
import { stripDiaMarkersFromDosis } from './med-receta-dates.mjs';
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';
import { isSuerosMedicationNombre } from './med-receta-soap-some-map.mjs';
import { pickSomeOralPack } from './med-receta-iv-oral-some.mjs';

function dosisBeforeSlash(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf('//');
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}

function isIvRoute(viaRaw) {
  return /\bINTRAVENOS/i.test(trimStr(viaRaw));
}

function isContinuousInfusionItem(item) {
  var parsed = dosisBeforeSlash(item && item.dosisRaw).toUpperCase();
  if (/VEL\.?\s*INF|MCG\s*\/\s*(?:MIN|HORA|H)\b|MG\s*\/\s*(?:MIN|HORA|H)\b|CC\s*\/\s*(?:HORA|H)\b/.test(parsed)) {
    return true;
  }
  var nombre = normalizeNombreForSoapClassify(item && item.nombreRaw);
  return /\b(NORADRENALINA|NOREPINEFRINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|FENILEFRINA|EPINEFRINA|ADRENALINA|NITROPRUSIATO|NITROGLICERINA)\b/.test(
    nombre
  );
}

function shouldSkipIvToOral(item) {
  if (!item || item.suspendido) return true;
  if (!isIvRoute(item.viaRaw)) return true;
  if (isContinuousInfusionItem(item)) return true;
  var nombre = normalizeNombreForSoapClassify(item.nombreRaw);
  if (
    /\b(DEXTROSA|GLUCOSA|INSULINA|HEPARINA|MEROPENEM|ERTAPENEM|IMIPENEM|VANCOMICINA|TEICOPLANINA|PIPERACILINA|CEFTRIAX|CEFEPIM|CEFTAZID|AMIKACINA|GENTAMICINA|TOBRAMICINA|FENTANILO|PROPOFOL|MIDAZOLAM|KETAMINA|CLORURO|POTASIO|MAGNESIO|FOSFATO|BICARBONATO|ALBUMINA|CONCENTRADO\s+ERITROCITARIO|PLASMA|PLAQUETAS|FIBRINOGENO|ROCURONIO|CISATRACURIO|VECURONIO|SUCCINILCOLINA)\b/.test(
      nombre
    )
  ) {
    return true;
  }
  if (isSuerosMedicationNombre(item.nombreRaw)) return true;
  return false;
}

function parseFixedDoseMg(dosisRaw) {
  var d = dosisBeforeSlash(dosisRaw).toUpperCase().replace(',', '.');
  var g = d.match(/^(\d+(?:\.\d+)?)\s*G$/);
  if (g) return { mg: parseFloat(g[1]) * 1000, text: g[1].replace(/\.0$/, '') + ' G' };
  var mg = d.match(/^(\d+(?:\.\d+)?)\s*MG$/);
  if (mg) return { mg: parseFloat(mg[1]), text: mg[1].replace(/\.0$/, '') + ' MG' };
  return null;
}

function formatMgLabel(mg) {
  if (mg >= 1000 && mg % 1000 === 0) return mg / 1000 + ' G';
  var n = Number(mg);
  return (Number.isInteger(n) ? String(n) : String(n).replace(/\.0$/, '')) + ' MG';
}

function displayDrugStem(nombreRaw) {
  var n = trimStr(nombreRaw).toUpperCase();
  var cut = n.search(
    /\s+(?:\d+\s*%|\d+\/\d+|\d+(?:[.,]\d+)?\s*(?:MG|G|ML|MCG|UI|U)\b|\bSOL(?:UCI[ÓO]N)?\s+INY\b|\bTABLETAS?\b|\bC[ÁA]PSULAS?\b|\bJARABE\b|\bGEL\b|\bPOLVO\b)/i
  );
  if (cut > 0) n = trimStr(n.slice(0, cut));
  return n.replace(/\s+/g, ' ');
}

function withPrnTail(dosisRaw, coreDose) {
  var raw = trimStr(dosisRaw);
  var idx = raw.indexOf('//');
  if (idx === -1) return coreDose;
  return coreDose + ' //' + trimStr(raw.slice(idx + 2));
}

function oralItemFrom(item, stem, oralMg, form, units, unitMg) {
  var doseLabel = formatMgLabel(oralMg);
  var packUnits = units > 0 ? units : 1;
  var packUnitMg = unitMg > 0 ? unitMg : oralMg;
  return Object.assign({}, item, {
    nombreRaw: stem + ' ' + formatMgLabel(packUnitMg) + ' ' + form,
    viaRaw: 'VIA ORAL',
    dosisRaw: withPrnTail(item.dosisRaw, doseLabel),
    oralEquiv: { units: packUnits, unitMg: packUnitMg, form: form },
  });
}

const KNOWN_ORAL_SWITCH_RE =
  /\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|ONDANSETRON|GRANISETRON|METOCLOPRAMIDA|DOMPERIDONA|METRONIDAZOL|DEXAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|FUROSEMIDA|LEVETIRACETAM|VALPROATO|ACIDO\s+VALPROICO|TRAMADOL|IBUPROFENO|DICLOFENACO|NAPROXENO|MELOXICAM|CELECOXIB|CIPROFLOXACINO|LEVOFLOXACINO|MOXIFLOXACINO|LINEZOLID|CLARITROMICINA|AZITROMICINA|DOXICICLINA|MINOCICLINA|CLINDAMICINA|FLUCONAZOL|ACICLOVIR|HALOPERIDOL|FENITOINA|BUTILHIOSCINA)\b/;

function steroidOralPrednisoneMg(nombre, doseMg) {
  if (/\bHIDROCORTISONA\b/.test(nombre)) {
    if (doseMg >= 100) return 25;
    if (doseMg >= 50) return 12.5;
    return 5;
  }
  if (/\bMETILPREDNISOLONA\b/.test(nombre)) {
    if (doseMg >= 40) return 50;
    if (doseMg >= 20) return 25;
    return 10;
  }
  return 0;
}

function clinicalOralTarget(nombre, doseMg, stem) {
  if (/\bKETOROLAC/.test(nombre)) {
    return { stem: stem, mg: doseMg >= 15 ? 10 : doseMg };
  }
  if (/\bCIPROFLOXACINO\b/.test(nombre)) {
    return { stem: stem, mg: doseMg >= 400 && doseMg < 500 ? 500 : doseMg };
  }
  if (/\bCLINDAMICINA\b/.test(nombre)) {
    return { stem: stem, mg: doseMg >= 600 ? 300 : doseMg };
  }
  var pred = steroidOralPrednisoneMg(nombre, doseMg);
  if (pred) return { stem: 'PREDNISONA', mg: pred };
  return null;
}

/**
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} item
 * @returns {typeof item}
 */
function resolveOralPack(nombre, oralMg, outStem, clinical) {
  var pack = pickSomeOralPack(nombre, oralMg) || pickSomeOralPack(outStem, oralMg);
  if (pack) return pack;
  if (clinical || KNOWN_ORAL_SWITCH_RE.test(nombre)) {
    return { unitMg: oralMg, units: 1, form: 'TABLETA' };
  }
  return null;
}

function convertByDrugRules(item) {
  var nombre = normalizeNombreForSoapClassify(item.nombreRaw);
  var dose = parseFixedDoseMg(item.dosisRaw);
  if (!dose) return item;
  var stem = displayDrugStem(item.nombreRaw);
  var clinical = clinicalOralTarget(nombre, dose.mg, stem);
  var oralMg = clinical ? clinical.mg : dose.mg;
  var outStem = clinical ? clinical.stem : stem;
  var pack = resolveOralPack(nombre, oralMg, outStem, clinical);
  if (!pack) return item;
  return oralItemFrom(item, outStem, oralMg, pack.form, pack.units, pack.unitMg);
}

/**
 * Devuelve copia del ítem con vía/dosis/nombre oral cuando hay regla de egreso.
 * @param {Record<string, unknown>} item
 * @param {{ ivOral?: boolean }} [opts] — `ivOral: false` conserva la vía hospitalaria.
 * @returns {Record<string, unknown>}
 */
export function applyIvToOralForEgreso(item, opts) {
  if (!item || opts && opts.ivOral === false) return item;
  if (shouldSkipIvToOral(item)) return item;
  return convertByDrugRules(item);
}

export { isIvRoute, shouldSkipIvToOral };
