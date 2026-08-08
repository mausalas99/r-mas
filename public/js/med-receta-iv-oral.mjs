/**
 * Conversión IV → oral para texto de egreso / SOAP (receta de alta).
 * Solo aplica a bolus o dosis fijas IV con equivalente oral claro; no infusión continua ni fármacos solo IV.
 */
import { trimStr } from './med-receta-util.mjs';
import { stripDiaMarkersFromDosis } from './med-receta-dates.mjs';
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';

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
    /\b(DEXTROSA|GLUCOSA|INSULINA|HEPARINA|MEROPENEM|ERTAPENEM|IMIPENEM|VANCOMICINA|TEICOPLANINA|PIPERACILINA|CEFTRIAX|CEFEPIME|CEFTAZID|AMIKACINA|GENTAMICINA|TOBRAMICINA|FENTANILO|PROPOFOL|MIDAZOLAM|KETAMINA|CLORURO|POTASIO|MAGNESIO|FOSFATO|BICARBONATO|ALBUMINA|CONCENTRADO\s+ERITROCITARIO|PLASMA|PLAQUETAS|FIBRINOGENO|ROCURONIO|CISATRACURIO|VECURONIO|SUCCINILCOLINA)\b/.test(
      nombre
    )
  ) {
    return true;
  }
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

function oralItemFrom(item, stem, oralMg, form) {
  var doseLabel = formatMgLabel(oralMg);
  return Object.assign({}, item, {
    nombreRaw: stem + ' ' + doseLabel + ' ' + form,
    viaRaw: 'VIA ORAL',
    dosisRaw: withPrnTail(item.dosisRaw, doseLabel),
  });
}

/**
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} item
 * @returns {typeof item}
 */
function convertByDrugRules(item) {
  var nombre = normalizeNombreForSoapClassify(item.nombreRaw);
  var dose = parseFixedDoseMg(item.dosisRaw);
  if (!dose) return item;
  var stem = displayDrugStem(item.nombreRaw);

  if (/\b(PARACETAMOL|ACETAMINOFEN)\b/.test(nombre)) {
    if (dose.mg >= 1000) return oralItemFrom(item, stem, 500, 'TABLETA');
    if (dose.mg >= 500) return oralItemFrom(item, stem, 500, 'TABLETA');
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\b(METAMIZOL|DIPIRONA)\b/.test(nombre)) {
    if (dose.mg >= 1000) return oralItemFrom(item, stem, 500, 'TABLETA');
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bKETOROLAC/.test(nombre)) {
    if (dose.mg >= 30) return oralItemFrom(item, stem, 10, 'TABLETA');
    if (dose.mg >= 15) return oralItemFrom(item, stem, 10, 'TABLETA');
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\b(OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL)\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\b(ONDANSETRON|GRANISETRON|METOCLOPRAMIDA|DOMPERIDONA)\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bMETRONIDAZOL\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bDEXAMETASONA\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bHIDROCORTISONA\b/.test(nombre)) {
    var predMg = dose.mg >= 100 ? 25 : dose.mg >= 50 ? 12.5 : 5;
    return oralItemFrom(item, 'PREDNISONA', predMg, 'TABLETA');
  }

  if (/\bMETILPREDNISOLONA\b/.test(nombre)) {
    var predFromMp = dose.mg >= 40 ? 50 : dose.mg >= 20 ? 25 : 10;
    return oralItemFrom(item, 'PREDNISONA', predFromMp, 'TABLETA');
  }

  if (/\bFUROSEMIDA\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bLEVETIRACETAM\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bVALPROATO\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bTRAMADOL\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\b(IBUPROFENO|DICLOFENACO|NAPROXENO|MELOXICAM|CELECOXIB)\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bCIPROFLOXACINO\b/.test(nombre)) {
    var ciproMg = dose.mg >= 400 ? 500 : dose.mg;
    return oralItemFrom(item, stem, ciproMg, 'TABLETA');
  }

  if (/\b(LEVOFLOXACINO|MOXIFLOXACINO|LINEZOLID|CLARITROMICINA|AZITROMICINA|DOXICICLINA|MINOCICLINA)\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  if (/\bCLINDAMICINA\b/.test(nombre)) {
    var clindaMg = dose.mg >= 600 ? 300 : dose.mg;
    return oralItemFrom(item, stem, clindaMg, 'CÁPSULA');
  }

  if (/\bFLUCONAZOL\b/.test(nombre)) {
    return oralItemFrom(item, stem, dose.mg, 'TABLETA');
  }

  return item;
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
