// labs.js — lab parsing and rendering helpers (no app state)

// ════════════════════════════════════════════════════════════════════
// LAB PARSER — ported from ~/Laboratoriazo App/index.html
// ════════════════════════════════════════════════════════════════════

export function extraer(nombres, bloque) {
  if (!bloque) return '---';
  for (var i = 0; i < nombres.length; i++) {
    var regex = new RegExp(nombres[i] + '[^0-9-]{0,60}(-?\\d+\\.?\\d*)', 'i');
    var m = bloque.match(regex);
    if (m) return m[1];
  }
  return '---';
}

export function extraerConRango(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t.indexOf(nombre);
    if (idx === -1) continue;
    // Start AFTER the test name to avoid matching digits within it
    var start = idx + nombre.length;
    var sub = texto.substring(start, start + 220);
    var mValor = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return { valor: valorStr,
             min: parseFloat(mRango[1].replace(',','.')),
             max: parseFloat(mRango[2].replace(',','.')) };
  }
  return { valor: '---', min: null, max: null };
}

/** True si el nombre del estudio (justo tras la keyword) es de orina, no sérico. */
function esContextoUrinario_(texto, idxNombre, nombreLen) {
  var b = Math.min(texto.length, idxNombre + nombreLen + 90);
  var w = texto.substring(idxNombre, b).toUpperCase();
  if (/\bEN\s+ORINA\b/.test(w)) return true;
  if (/\bURINARIO\b/.test(w)) return true;
  if (/\bURINARIA\b/.test(w)) return true;
  return false;
}

/**
 * Igual que extraerConRango pero ignora ocurrencias en contexto urinario
 * (p. ej. SODIO EN ORINA bajo QUIMICA CLINICA cuando el reporte no trae suero).
 */
function extraerConRangoSuero(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoUrinario_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return { valor: valorStr,
        min: parseFloat(mRango[1].replace(',', '.')),
        max: parseFloat(mRango[2].replace(',', '.')) };
    }
  }
  return { valor: '---', min: null, max: null };
}

export function marcarSegunRango(valorStr, min, max) {
  if (valorStr === '---' || valorStr == null) return valorStr;
  var v = parseFloat(String(valorStr).replace(',','.'));
  if (isNaN(v) || min == null || max == null) return valorStr;
  return (v < min || v > max) ? valorStr + '*' : valorStr;
}

export function fmt(val) {
  if (!val || val === '---') return val;
  var star = val.endsWith('*');
  var n = parseFloat((star ? val.slice(0,-1) : val).replace(',','.'));
  if (isNaN(n)) return val;
  return String(n) + (star ? '*' : '');
}

export function parseBH_(tNorm) {
  // Helper: extraer un número simple para una etiqueta tipo "NEU%" donde el
  // extractor con rango no funciona (no hay min/max). Toma el primer número
  // que aparece después de la etiqueta literal.
  function extraerSimple(labels, texto) {
    if (!texto) return '';
    for (var li = 0; li < labels.length; li++) {
      var lbl = labels[li];
      var idx = -1;
      var up = String(texto).toUpperCase();
      var lu = lbl.toUpperCase();
      var from = 0;
      while (true) {
        var p = up.indexOf(lu, from);
        if (p === -1) break;
        var after = up.charAt(p + lu.length);
        var before = up.charAt(p - 1) || ' ';
        var isWordBoundaryBefore = !/[A-Z0-9_]/.test(before);
        var isExactBoundary = lu.charAt(lu.length - 1) === '%' || !/[A-Z0-9]/.test(after);
        if (isWordBoundaryBefore && isExactBoundary) { idx = p + lu.length; break; }
        from = p + lu.length;
      }
      if (idx === -1) continue;
      var sub = texto.substring(idx, idx + 80);
      var m = sub.match(/(-?\d+[.,]?\d*)/);
      if (m) return m[1].replace(',', '.');
    }
    return '';
  }

  // Conserva el comportamiento previo (ranged extraction) para los campos clásicos:
  var hbData   = extraerConRango(['HGB','HEMOGLOBINA TOTAL','HEMOGLOBINA'], tNorm);
  var htoData  = extraerConRango(['HCT ','HEMATOCRITO'], tNorm);
  var vcmData  = extraerConRango(['MCV ','VCM '], tNorm);
  var hcmData  = extraerConRango(['MCH ','HCM '], tNorm);
  var leuData  = extraerConRango(['WBC '], tNorm);
  var neuData  = extraerConRango(['NEU '], tNorm);
  var eosData  = extraerConRango(['EOS '], tNorm);
  var pltData  = extraerConRango(['PLT '], tNorm);
  var retData  = extraerConRango(['RETICULOCITOS'], tNorm);
  var tpData   = extraerConRango(['TIEMPO DE PROTROMBINA'], tNorm);
  var ttpData  = extraerConRango(['TIEMPO DE TROMBOPLASTINA'], tNorm);
  var inrData  = extraerConRango(['INR ', 'INR'], tNorm);
  // Nuevos (rojos / plaq / VPM):
  var rbcData  = extraerConRango(['RBC ', 'ERITROCITOS', 'HEMATIES'], tNorm);
  var chcmData = extraerConRango(['MCHC', 'CHCM'], tNorm);
  var rdwData  = extraerConRango(['RDW '], tNorm);
  var mpvData  = extraerConRango(['MPV ', 'VPM '], tNorm);

  // Marcado con rangos (visible)
  var Hb   = fmt(marcarSegunRango(hbData.valor,   hbData.min,   hbData.max));
  var Hto  = fmt(marcarSegunRango(htoData.valor,  htoData.min,  htoData.max));
  var VCM  = fmt(marcarSegunRango(vcmData.valor,  vcmData.min,  vcmData.max));
  var HCM  = fmt(marcarSegunRango(hcmData.valor,  hcmData.min,  hcmData.max));
  var CHCM = fmt(marcarSegunRango(chcmData.valor, chcmData.min, chcmData.max));
  var RDW  = fmt(marcarSegunRango(rdwData.valor,  rdwData.min,  rdwData.max));
  var Leu  = fmt(marcarSegunRango(leuData.valor,  leuData.min,  leuData.max));
  var RBC  = fmt(marcarSegunRango(rbcData.valor,  rbcData.min,  rbcData.max));
  var Plt  = fmt(marcarSegunRango(pltData.valor,  pltData.min,  pltData.max));
  var MPV  = fmt(marcarSegunRango(mpvData.valor,  mpvData.min,  mpvData.max));
  var Ret  = fmt(marcarSegunRango(retData.valor,  retData.min,  retData.max));
  var TP   = fmt(marcarSegunRango(tpData.valor,   tpData.min,   tpData.max));
  var TTP  = fmt(marcarSegunRango(ttpData.valor,  ttpData.min,  ttpData.max));
  var INR  = fmt(marcarSegunRango(inrData.valor,  inrData.min,  inrData.max));
  var Neu  = fmt(marcarSegunRango(neuData.valor,  neuData.min,  neuData.max));
  var Eos  = fmt(marcarSegunRango(eosData.valor,  eosData.min,  eosData.max));

  // EXTRAS: valores crudos (string), sin marcadores de rango.
  var extras = {};
  function pushExtra(key, value) {
    if (value && value !== '---' && value !== '') extras[key] = String(value);
  }
  // Linfocitos / Monocitos / Basófilos absolutos (nuevos):
  var linData  = extraerConRango(['LYM ', 'LINFOCITOS'], tNorm);
  var monoData = extraerConRango(['MONO '], tNorm);
  var basoData = extraerConRango(['BASO '], tNorm);
  pushExtra('Lin',  linData.valor);
  pushExtra('Mono', monoData.valor);
  pushExtra('Baso', basoData.valor);
  // Porcentajes (parseados pero ocultos):
  pushExtra('NeuPct',  extraerSimple(['NEU%',  'NEUTROFILOS%'],  tNorm));
  pushExtra('LinPct',  extraerSimple(['LYM%',  'LINFOCITOS%'],   tNorm));
  pushExtra('MonoPct', extraerSimple(['MONO%', 'MONOCITOS%'],    tNorm));
  pushExtra('EosPct',  extraerSimple(['EOS%',  'EOSINOFILOS%'],  tNorm));
  pushExtra('BasoPct', extraerSimple(['BASO%', 'BASOFILOS%'],    tNorm));
  // Frotis manual:
  pushExtra('Bandas',    extraerSimple(['BANDAS', 'CAYADOS'], tNorm));
  pushExtra('Mielo',     extraerSimple(['MIELOCITOS'], tNorm));
  pushExtra('Metamielo', extraerSimple(['METAMIELOCITOS'], tNorm));
  pushExtra('Promielo',  extraerSimple(['PROMIELOCITOS'], tNorm));
  pushExtra('Blastos',   extraerSimple(['BLASTOS'], tNorm));
  pushExtra('Atipicos',  extraerSimple(['LINFOCITOS ATIPICOS', 'VARIANTES', 'ATIPICOS'], tNorm));

  // Línea compacta (BH extendida OFF): Hb Hto VCM HCM Leu Neu Eos Plt (+ coag si hace falta).
  // RBC, CHCM, RDW, MPV y Ret van a extras y solo se muestran en la segunda fila con BH extendida ON.
  var hasCore = [Hb, Hto, VCM, HCM, Leu, Neu, Eos, Plt].some(function (v) {
    return v !== '---';
  });
  var hasExtIdx = [RBC, CHCM, RDW, MPV, Ret].some(function (v) {
    return v !== '---';
  });
  var hasCoag = [TP, TTP, INR].some(function (v) { return v !== '---'; });
  if (!hasCore && !hasExtIdx && !hasCoag && Object.keys(extras).length === 0) {
    return { visible: '', extras: {} };
  }

  var p = ['BH'];
  if (Hb   !== '---') p.push('Hb', Hb);
  if (Hto  !== '---') p.push('Hto', Hto);
  if (VCM  !== '---') p.push('VCM', VCM);
  if (HCM  !== '---') p.push('HCM', HCM);
  if (Leu  !== '---') p.push('Leu', Leu);
  if (Neu !== '---') p.push('Neu', Neu);
  if (Eos !== '---') p.push('Eos', Eos);
  if (Plt  !== '---') p.push('Plt', Plt);

  var hasCompactBody = p.length > 1;
  if (hasCompactBody || hasCoag) {
    if (RBC  !== '---') pushExtra('RBC', RBC);
    if (CHCM !== '---') pushExtra('CHCM', CHCM);
    if (RDW  !== '---') pushExtra('RDW', RDW);
    if (MPV  !== '---') pushExtra('MPV', MPV);
    if (Ret  !== '---') pushExtra('Ret', Ret);
  } else {
    if (RBC  !== '---') p.push('RBC', RBC);
    if (CHCM !== '---') p.push('CHCM', CHCM);
    if (RDW  !== '---') p.push('RDW', RDW);
    if (MPV  !== '---') p.push('MPV', MPV);
    if (Ret  !== '---') p.push('Ret', Ret);
  }
  var coag = [];
  if (TP  !== '---') coag.push('TP',  TP);
  if (TTP !== '---') coag.push('TTP', TTP);
  if (INR !== '---') coag.push('INR', INR);
  if (coag.length) { p.push('-'); p = p.concat(coag); }
  var visible = (p.length > 1) ? (p[0] + '\t' + p.slice(1).join(' ')) : '';
  return { visible: visible, extras: extras };
}

// Procalcitonina viene en bloque "ESTUDIOS ESPECIALES" con un rango de
// referencia que mezcla intervalos pediátricos por horas (e.g. "0 - 5
// HORAS"); el extractor genérico tomaría esos números como rango. Aquí
// usamos el indicador "ADULTO <X" para fijar el max y dejamos min=0.
export function extraerProcalcitonina_(texto) {
  var defaultRange = { valor: '---', min: 0, max: 0.05 };
  if (!texto) return defaultRange;
  var t = texto.toUpperCase();
  var positions = [];
  var start = 0;
  while (true) {
    var p = t.indexOf('PROCALCITONINA', start);
    if (p === -1) break;
    positions.push(p);
    start = p + 'PROCALCITONINA'.length;
  }
  if (!positions.length) return defaultRange;
  for (var i = positions.length - 1; i >= 0; i--) {
    var pos = positions[i] + 'PROCALCITONINA'.length;
    var sub = texto.substring(pos, pos + 220);
    var mVal = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mVal) continue;
    var valor = mVal[1];
    var rangeM = sub.match(/ADULTO[^0-9<]*<\s*=?\s*(\d+[.,]?\d*)/i);
    var max = rangeM ? parseFloat(rangeM[1].replace(',', '.')) : 0.05;
    return { valor: valor, min: 0, max: max };
  }
  return defaultRange;
}

/**
 * Edad en años (aprox.) desde demografía típica de encabezado de laboratorio.
 */
export function ageYearsFromLabDemographics(edadRaw, edadUnidad) {
  var n = parseInt(String(edadRaw == null ? '' : edadRaw).trim(), 10);
  if (!isFinite(n) || n < 0) return null;
  var u = String(edadUnidad || 'años').toLowerCase();
  if (u === 'meses') return n / 12;
  if (u === 'días' || u === 'dias') return n / 365.25;
  if (u === 'semanas') return n / 52.143;
  return n;
}

/**
 * eGFR mL/min/1.73 m² — CKD-EPI 2021 (creatinina, sin raza). Scr en mg/dL; edad ≥ 18.
 * Ref.: CKD-EPI creatinine 2021 (κ, α, 0.9938^edad, ×1.012 si mujer).
 */
export function computeEgfrCkdEpi2021Creatinine(scrMgDl, ageYears, isFemale) {
  var scr = typeof scrMgDl === 'number' ? scrMgDl : parseFloat(String(scrMgDl || '').replace(/,/g, '.'));
  if (!isFinite(scr) || scr <= 0) return null;
  var age = Number(ageYears);
  if (!isFinite(age) || age < 18 || age > 120) return null;
  var k = isFemale ? 0.7 : 0.9;
  var alpha = isFemale ? -0.241 : -0.302;
  var scrK = scr / k;
  var minTerm = Math.min(scrK, 1);
  var maxTerm = Math.max(scrK, 1);
  var egfr =
    142 *
    Math.pow(minTerm, alpha) *
    Math.pow(maxTerm, -1.2) *
    Math.pow(0.9938, age) *
    (isFemale ? 1.012 : 1);
  if (!isFinite(egfr) || egfr <= 0) return null;
  return egfr;
}

export function parseQS_(texto, patientCtx) {
  var gluData = extraerConRangoSuero(['GLUCOSA EN SANGRE','GLUCOSA EN','GLUCOSA'], texto);
  var crData  = extraerConRangoSuero(['CREATININA EN SANGRE','CREATININA'], texto);
  var bunData = extraerConRangoSuero(['NITROGENO DE LA UREA EN SANGRE','NITROGENO DE LA UREA','UREA'], texto);
  var pcrData = extraerConRangoSuero(['PROTEINA C REACTIVA','PROTEÍNA C REACTIVA'], texto);
  var pctData = extraerProcalcitonina_(texto);
  var auData  = extraerConRangoSuero(['ACIDO URICO EN SANGRE','ACIDO URICO','ÁCIDO ÚRICO'], texto);
  var tglData = extraerConRangoSuero(['TRIGLICERIDOS','TRIGLICÉRIDOS'], texto);
  var colData = extraerConRangoSuero(['COLESTEROL'], texto);
  var vsgData = extraerConRangoSuero(['VSG ','VELOCIDAD DE SEDIMENTACION'], texto);
  var cpkData = extraerConRangoSuero(['CPK CREATIN FOSFO QUINASA','CPK '], texto);

  var Glu = fmt(marcarSegunRango(gluData.valor, gluData.min, gluData.max));
  var Cr  = fmt(marcarSegunRango(crData.valor,  crData.min,  crData.max));
  var BUN = fmt(marcarSegunRango(bunData.valor, bunData.min, bunData.max));
  var PCR = fmt(marcarSegunRango(pcrData.valor, pcrData.min, pcrData.max));
  var PCT = fmt(marcarSegunRango(pctData.valor, pctData.min, pctData.max));
  var AU  = fmt(marcarSegunRango(auData.valor,  auData.min,  auData.max));
  var TGL = fmt(marcarSegunRango(tglData.valor, tglData.min, tglData.max));
  var COL = fmt(marcarSegunRango(colData.valor, colData.min, colData.max));
  var VSG = fmt(marcarSegunRango(vsgData.valor, vsgData.min, vsgData.max));
  var CPK = fmt(marcarSegunRango(cpkData.valor, cpkData.min, cpkData.max));

  if ([Glu,Cr,BUN,PCR,PCT,AU,TGL,COL,VSG,CPK].every(function(v){return v==='---';})) return '';

  var p = ['QS'];
  if (Glu !== '---') p.push('Glu', Glu);
  if (Cr  !== '---') {
    p.push('Cr', Cr);
    var ageY = patientCtx ? ageYearsFromLabDemographics(patientCtx.edad, patientCtx.edadUnidad) : null;
    var sexo = patientCtx && patientCtx.sexo;
    if (ageY != null && ageY >= 18 && (sexo === 'M' || sexo === 'F')) {
      var scrNum = toNum_(crData.valor);
      if (scrNum != null && scrNum > 0) {
        var egfr = computeEgfrCkdEpi2021Creatinine(scrNum, ageY, sexo === 'F');
        if (egfr != null) p.push('eTFG', String(Math.round(egfr)));
      }
    }
  }
  if (BUN !== '---') p.push('BUN', BUN);
  if (PCR !== '---') p.push('PCR', PCR);
  if (PCT !== '---') p.push('PCT', PCT);
  if (AU  !== '---') p.push('AU',  AU);
  if (TGL !== '---') p.push('TGL', TGL);
  if (COL !== '---') p.push('COL', COL);
  if (VSG !== '---') p.push('VSG', VSG);
  if (CPK !== '---') p.push('CPK', CPK);
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parseESC_(texto) {
  var naData = extraerConRangoSuero(['SODIO'], texto);
  if (naData.valor === '---') return '';
  var clData = extraerConRangoSuero(['CLORO'], texto);
  var kData  = extraerConRangoSuero(['POTASIO'], texto);
  var caData = extraerConRangoSuero(['CALCIO EN SUERO','CALCIO'], texto);
  var fData  = extraerConRangoSuero(['FOSFORO EN SANGRE','FOSFORO','FÓSFORO'], texto);
  var mgData = extraerConRangoSuero(['MAGNESIO'], texto);

  var Na = fmt(marcarSegunRango(naData.valor, naData.min, naData.max));
  var Cl = fmt(marcarSegunRango(clData.valor, clData.min, clData.max));
  var K  = fmt(marcarSegunRango(kData.valor,  kData.min,  kData.max));
  var Ca = fmt(marcarSegunRango(caData.valor, caData.min, caData.max));
  var F  = fmt(marcarSegunRango(fData.valor,  fData.min,  fData.max));
  var Mg = fmt(marcarSegunRango(mgData.valor, mgData.min, mgData.max));

  var p = ['ESC'];
  p.push('Na', Na);
  if (Cl !== '---') p.push('Cl', Cl);
  if (K  !== '---') p.push('K',  K);
  if (Ca !== '---') p.push('Ca', Ca);
  if (F  !== '---') p.push('F',  F);
  if (Mg !== '---') p.push('Mg', Mg);
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parsePFH_(tNorm) {
  var albData  = extraerConRangoSuero(['ALBUMINA'], tNorm);
  var astData  = extraerConRango(['AST(ASPARTATO AMINOTRANSFERASA)','AST '], tNorm);
  var altData  = extraerConRango(['ALT ALANIN AMINO TRANSFERASA','ALT '], tNorm);
  var alpData  = extraerConRango(['ALP FOSFATASA ALCALINA','FOSFATASA ALCALINA'], tNorm);
  var btData   = extraerConRango(['BILIRRUBINA TOTAL'], tNorm);
  var bdData   = extraerConRango(['BILIRRUBINA DIRECTA'], tNorm);
  var biData   = extraerConRango(['BILIRRUBINA INDIRECTA'], tNorm);
  var ldhData  = extraerConRango(['LDH DESHIDROGENASA LACTICA','LDH '], tNorm);
  var amilData = extraerConRango(['AMILASA SERICA','AMILASA'], tNorm);

  var Alb  = fmt(marcarSegunRango(albData.valor,  albData.min,  albData.max));
  var AST  = fmt(marcarSegunRango(astData.valor,  astData.min,  astData.max));
  var ALT  = fmt(marcarSegunRango(altData.valor,  altData.min,  altData.max));
  var FA   = fmt(marcarSegunRango(alpData.valor,  alpData.min,  alpData.max));
  var BT   = fmt(marcarSegunRango(btData.valor,   btData.min,   btData.max));
  var BD   = fmt(marcarSegunRango(bdData.valor,   bdData.min,   bdData.max));
  var BI   = fmt(marcarSegunRango(biData.valor,   biData.min,   biData.max));
  var LDH  = fmt(marcarSegunRango(ldhData.valor,  ldhData.min,  ldhData.max));
  var Amil = fmt(marcarSegunRango(amilData.valor, amilData.min, amilData.max));

  if ([Alb,AST,ALT,FA,BT,BD,BI,LDH,Amil].every(function(v){return v==='---';})) return '';
  var p = ['PFHs'];
  if (Alb  !== '---') p.push('Alb',  Alb);
  if (AST  !== '---') p.push('AST',  AST);
  if (ALT  !== '---') p.push('ALT',  ALT);
  if (FA   !== '---') p.push('FA',   FA);
  if (BT   !== '---') p.push('BT',   BT);
  if (BD   !== '---') p.push('BD',   BD);
  if (BI   !== '---') p.push('BI',   BI);
  if (LDH  !== '---') p.push('LDH',  LDH);
  if (Amil !== '---') p.push('Amil', Amil);
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parseGaso_(bloqueGaso, textoFuera) {
  if (!bloqueGaso) return '';
  var phData   = extraerConRango(['PH '], bloqueGaso);
  if (phData.valor === '---') return '';
  var pco2Data = extraerConRango(['PCO2'], bloqueGaso);
  var po2Data  = extraerConRango(['PO2 '], bloqueGaso);
  var naData   = extraerConRango(['SODIO'], bloqueGaso);
  var kData    = extraerConRango(['POTASIO'], bloqueGaso);
  var gluData  = extraerConRango(['GLUCOSA'], bloqueGaso);
  var lacData  = extraerConRango(['LACTATO'], bloqueGaso);
  var hco3Data = extraerConRango(['HCO3'], bloqueGaso);
  var htoData  = extraerConRango(['HCT ', 'HEMATOCRITO'], bloqueGaso);
  // Ca++ ionizado suele aparecer en OBSERVACIONES como texto libre
  // (p. ej. "Ca++ IONIZADO: 0.92 mmol/L"). Sin rango explícito en el
  // reporte; se aplica el rango adulto estándar 1.12-1.32 mmol/L.
  var iCaData = extraerConRango(['CA++ IONIZADO', 'CALCIO IONIZADO', 'CA IONIZADO'], bloqueGaso);
  var iCaMin = iCaData.min != null ? iCaData.min : 1.12;
  var iCaMax = iCaData.max != null ? iCaData.max : 1.32;

  // Anion gap = Na - (Cl + HCO3). Na y Cl SOLO se toman de la química
  // sanguínea / electrolitos séricos (textoFuera). Si el reporte es solo
  // gasometría, no se muestra AG aunque el bloque arterial completo
  // traiga sus propios Na/Cl: el médico quiere usar los valores de
  // química como fuente única de verdad.
  var naAG = textoFuera ? extraerConRangoSuero(['SODIO'], textoFuera) : { valor: '---' };
  var clAG = textoFuera ? extraerConRangoSuero(['CLORO'], textoFuera) : { valor: '---' };
  var albAG = textoFuera ? extraerConRangoSuero(['ALBUMINA'], textoFuera) : { valor: '---' };

  var pH   = fmt(marcarSegunRango(phData.valor,   phData.min,   phData.max));
  var pCO2 = fmt(marcarSegunRango(pco2Data.valor, pco2Data.min, pco2Data.max));
  var pO2  = fmt(marcarSegunRango(po2Data.valor,  po2Data.min,  po2Data.max));
  var Na   = fmt(marcarSegunRango(naData.valor,   naData.min,   naData.max));
  var K    = fmt(marcarSegunRango(kData.valor,    kData.min,    kData.max));
  var GLU  = fmt(marcarSegunRango(gluData.valor,  gluData.min,  gluData.max));
  var Lac  = fmt(marcarSegunRango(lacData.valor,  lacData.min,  lacData.max));
  var Bica = fmt(marcarSegunRango(hco3Data.valor, hco3Data.min, hco3Data.max));
  var Hto  = fmt(marcarSegunRango(htoData.valor, htoData.min, htoData.max));
  var iCa  = fmt(marcarSegunRango(iCaData.valor,  iCaMin,        iCaMax));
  var AG   = computeAnionGap_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  var AGv  = computeAnionGapValue_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  var DD   = computeDeltaDelta_(AGv, hco3Data.valor);

  var p = ['GASES'];
  p.push('pH', pH);
  if (pCO2 !== '---') p.push('pCO2', pCO2);
  if (pO2  !== '---') p.push('pO2',  pO2);
  if (Na   !== '---') p.push('Na',   Na);
  if (K    !== '---') p.push('K',    K);
  if (GLU  !== '---') p.push('GLU',  GLU);
  if (Lac  !== '---') p.push('Lactato', Lac);
  if (Bica !== '---') p.push('Bica', Bica);
  if (AG   !== '---') p.push('AG',   AG);
  if (DD   !== '---') p.push('Delta-Delta', DD);
  if (Hto  !== '---') p.push('Hto',  Hto);
  if (iCa  !== '---') p.push('iCa',  iCa);
  return p[0]+'\t'+p.slice(1).join(' ');
}

function toNum_(v) {
  if (v === '---' || v == null) return null;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function buildGasoInterpretacion_(bloqueGaso, textoFuera) {
  if (!bloqueGaso) return '';
  var phData   = extraerConRango(['PH '], bloqueGaso);
  if (phData.valor === '---') return '';
  var pco2Data = extraerConRango(['PCO2'], bloqueGaso);
  var hco3Data = extraerConRango(['HCO3'], bloqueGaso);
  var naAG = textoFuera ? extraerConRangoSuero(['SODIO'], textoFuera) : { valor: '---' };
  var clAG = textoFuera ? extraerConRangoSuero(['CLORO'], textoFuera) : { valor: '---' };
  var albAG = textoFuera ? extraerConRangoSuero(['ALBUMINA'], textoFuera) : { valor: '---' };
  var ag = computeAnionGapValue_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  var dd = computeDeltaDeltaValue_(ag, hco3Data.valor);

  var pH = toNum_(phData.valor);
  var pCO2 = toNum_(pco2Data.valor);
  var hco3 = toNum_(hco3Data.valor);
  if (pH == null || (pCO2 == null && hco3 == null)) return '';

  return buildGasoInterpretacionFromValues_(pH, pCO2, hco3, ag, dd);
}

function labSectionKey_(line) {
  var s = String(line == null ? '' : line).trim();
  if (!s) return '';
  var tab = s.indexOf('\t');
  if (tab >= 0) return s.substring(0, tab).trim().toUpperCase();
  var colon = s.indexOf(':');
  if (colon > 0) return s.substring(0, colon + 1).trim().toUpperCase();
  var m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b/);
  return m ? m[1].toUpperCase() : s.toUpperCase();
}

function lineRichnessScore_(line) {
  var s = normalizeLabLine_(line);
  if (!s) return 0;
  var score = s.length;
  score += (s.match(/\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  return score;
}

function normalizeGasometryInterpretationLine_(line) {
  var s = String(line == null ? '' : line);
  return /^Interpretación gasometría:/i.test(s.trim()) ? s.toUpperCase() : s;
}

function normalizeLabLine_(line) {
  return normalizeGasometryInterpretationLine_(line).replace(/\s+/g, ' ').trim();
}

/** Texto de sección para filtrar / deduplicar (p. ej. fila BH como `{ visible, extras }`). */
function labRowText_(row) {
  if (row && typeof row === 'object' && typeof row.visible === 'string') return row.visible;
  return String(row == null ? '' : row);
}

function dedupeSingletonSections_(rows) {
  var singleton = {
    BH: 1, QS: 1, ESC: 1, PFHS: 1, GASES: 1, PIE: 1, 'LCR:': 1, 'LIQ:': 1,
    HECES: 1, FROTIS: 1, EGO: 1, PROT12H: 1, PROT24H: 1, 'INTERPRETACIÓN GASOMETRÍA:': 1,
  };
  var list = (rows || []).filter(function (r) { return normalizeLabLine_(labRowText_(r)) !== ''; });
  var best = Object.create(null);
  var keep = [];
  for (var i = 0; i < list.length; i++) {
    var raw = list[i];
    var rowText = labRowText_(raw);
    var key = labSectionKey_(rowText);
    if (!singleton[key]) {
      keep.push(raw);
      continue;
    }
    var cand = { row: raw, idx: i, score: lineRichnessScore_(rowText) };
    var prev = best[key];
    if (!prev || cand.score > prev.score || (cand.score === prev.score && cand.idx > prev.idx)) {
      best[key] = cand;
    }
  }
  var chosen = Object.create(null);
  Object.keys(best).forEach(function (k) { chosen[best[k].idx] = best[k].row; });
  var out = [];
  for (var j = 0; j < list.length; j++) {
    var raw = list[j];
    var rText = labRowText_(raw);
    var k = labSectionKey_(rText);
    if (!singleton[k]) out.push(raw);
    else if (chosen[j]) out.push(chosen[j]);
  }
  return out;
}

function valueFromSectionLine_(line, key) {
  var s = normalizeLabLine_(line);
  if (!s) return null;
  var m = s.match(new RegExp('(?:^|\\s)' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(-?\\d+(?:\\.\\d+)?)', 'i'));
  return m ? m[1] : null;
}

function pickBestSectionLine_(rows, sectionName) {
  var sec = String(sectionName || '').toUpperCase();
  var best = null;
  (rows || []).forEach(function (row, idx) {
    if (labSectionKey_(row) !== sec) return;
    var cand = { row: String(row), idx: idx, score: lineRichnessScore_(row) };
    if (!best || cand.score > best.score || (cand.score === best.score && cand.idx > best.idx)) best = cand;
  });
  return best ? best.row : '';
}

function formatNumericToken_(n) {
  if (n == null || !isFinite(n)) return '';
  var rounded = Math.round((n + Number.EPSILON) * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}

function buildGasoInterpretacionFromValues_(pH, pCO2, hco3, ag, dd) {
  if (pH == null || (pCO2 == null && hco3 == null)) return '';
  var primaria = '';
  if (pH < 7.35) {
    if (hco3 != null && hco3 < 22) primaria = 'Acidosis metabólica';
    else if (pCO2 != null && pCO2 > 45) primaria = 'Acidosis respiratoria';
  } else if (pH > 7.45) {
    if (hco3 != null && hco3 > 26) primaria = 'Alcalosis metabólica';
    else if (pCO2 != null && pCO2 < 35) primaria = 'Alcalosis respiratoria';
  } else if (hco3 != null && pCO2 != null) {
    if (hco3 < 22 && pCO2 < 35) primaria = 'Acidosis metabólica con compensación respiratoria';
    else if (hco3 > 26 && pCO2 > 45) primaria = 'Alcalosis metabólica con compensación respiratoria';
    else if (hco3 < 22) primaria = 'Acidosis metabólica con compensación respiratoria';
    else if (hco3 > 26) primaria = 'Alcalosis metabólica con compensación respiratoria';
  }
  if (!primaria && pH >= 7.35 && pH <= 7.45 && hco3 != null) {
    if (hco3 < 22) primaria = 'Acidosis metabólica';
    else if (hco3 > 26) primaria = 'Alcalosis metabólica';
  }
  var partes = [];
  if (primaria) partes.push(primaria);
  if (!primaria) partes.push('Trastorno ácido-base compensado');
  if (ag != null && ag > 12 && dd != null) {
    if (dd < 0.8) {
      if (/^Acidosis metabólica/i.test(primaria)) {
        partes.push('Componente hiperclorémico con anion gap elevado (Delta-Delta bajo)');
      } else {
        partes.push('Acidosis metabólica hiperclorémica con anion gap elevado (Delta-Delta bajo)');
      }
    } else if (dd > 2) {
      if (/^Alcalosis metabólica/i.test(primaria)) {
        partes.push('Componente agregado con anion gap elevado (Delta-Delta alto), considerar acidosis respiratoria crónica');
      } else {
        partes.push('Alcalosis metabólica agregada o acidosis respiratoria crónica con anion gap elevado (Delta-Delta alto)');
      }
    }
    else partes.push('Anion gap elevado');
  }
  return ('Interpretación gasometría:\t' + partes.join('; ')).toUpperCase();
}

function rebuildGasesFromResults_(rows) {
  var gases = pickBestSectionLine_(rows, 'GASES');
  if (!gases) return { gasesLine: '', interpLine: '' };
  var base = normalizeLabLine_(gases);
  var out = ['GASES'];
  var orderedKeys = ['pH', 'pCO2', 'pO2', 'Na', 'K', 'GLU', 'Lactato', 'Bica', 'Hto', 'iCa'];
  var values = {};
  orderedKeys.forEach(function (k) {
    values[k] = valueFromSectionLine_(base, k);
  });

  var qs = pickBestSectionLine_(rows, 'QS');
  var esc = pickBestSectionLine_(rows, 'ESC');
  var pfhs = pickBestSectionLine_(rows, 'PFHS');
  var na = valueFromSectionLine_(qs, 'Na') || valueFromSectionLine_(esc, 'Na') || values.Na;
  var cl = valueFromSectionLine_(qs, 'Cl') || valueFromSectionLine_(esc, 'Cl');
  var alb = valueFromSectionLine_(pfhs, 'Alb');
  var bica = values.Bica;

  orderedKeys.forEach(function (k) {
    if (values[k] != null && values[k] !== '') out.push(k, values[k]);
  });

  var agv = computeAnionGapValue_(na || '---', cl || '---', bica || '---', alb || '---');
  if (agv != null) {
    var agStr = formatNumericToken_(agv);
    out.push('AG', marcarSegunRango(agStr, 8, 12));
  }
  var ddv = computeDeltaDeltaValue_(agv, bica || '---');
  if (ddv != null) out.push('Delta-Delta', formatNumericToken_(ddv));

  var phV = toNum_(values.pH);
  var pco2V = toNum_(values.pCO2);
  var hco3V = toNum_(values.Bica);
  var interp = buildGasoInterpretacionFromValues_(phV, pco2V, hco3V, agv, ddv);
  return { gasesLine: out[0] + '\t' + out.slice(1).join(' '), interpLine: interp };
}

export function reprocessLabResultLines_(rows) {
  var clean = dedupeSingletonSections_(rows || []);
  var rebuilt = rebuildGasesFromResults_(clean);
  var out = clean.filter(function (r) {
    var k = labSectionKey_(r);
    return k !== 'GASES' && k !== 'INTERPRETACIÓN GASOMETRÍA:';
  });
  if (rebuilt.gasesLine) out.push(rebuilt.gasesLine);
  if (rebuilt.interpLine) out.push(rebuilt.interpLine);
  return dedupeSingletonSections_(out);
}

function computeAnionGapValue_(naStr, clStr, hco3Str, albStr) {
  if (naStr === '---' || clStr === '---' || hco3Str === '---') return null;
  var na = parseFloat(String(naStr).replace(',', '.'));
  var cl = parseFloat(String(clStr).replace(',', '.'));
  var hco3 = parseFloat(String(hco3Str).replace(',', '.'));
  if (isNaN(na) || isNaN(cl) || isNaN(hco3)) return null;
  var ag = na - (cl + hco3);
  var alb = parseFloat(String(albStr == null ? '' : albStr).replace(',', '.'));
  if (!isNaN(alb)) ag += 2.5 * (4 - alb);
  return ag;
}

function computeDeltaDeltaValue_(agValue, hco3Str) {
  if (agValue == null) return null;
  var hco3 = parseFloat(String(hco3Str).replace(',', '.'));
  if (isNaN(hco3)) return null;
  var deltaHco3 = 24 - hco3;
  if (deltaHco3 <= 0) return null;
  return (agValue - 12) / deltaHco3;
}

function computeDeltaDelta_(agValue, hco3Str) {
  var dd = computeDeltaDeltaValue_(agValue, hco3Str);
  if (dd == null) return '---';
  var rounded = Math.round(dd * 10) / 10;
  return (rounded === Math.trunc(rounded)) ? String(rounded.toFixed(0)) : String(rounded);
}

// Anion gap clásico (sin K), con corrección por albúmina opcional:
// AGcorr = AG + 2.5 * (4 - Alb[g/dL]).
// Rango normal 8-12 mEq/L. Devuelve string formateado
// (p. ej. "12" o "18.8*"), o '---' si falta cualquier dato crítico.
export function computeAnionGap_(naStr, clStr, hco3Str, albStr) {
  var ag = computeAnionGapValue_(naStr, clStr, hco3Str, albStr);
  if (ag == null) return '---';
  // Una decimal cuando el valor no es entero (mismo comportamiento
  // visual que Bica 21.2 vs Na 140).
  var rounded = Math.round((ag + Number.EPSILON) * 10) / 10;
  var agStr = (rounded === Math.trunc(rounded)) ? String(rounded.toFixed(0)) : String(rounded);
  return marcarSegunRango(agStr, 8, 12);
}

export function parsePIE_(tNorm) {
  var hasPIEInmuno = /PRUEBA INMUNOLOGICA DE EMBARAZO/i.test(tNorm);
  var hasPrueba    = /PRUEBA DE EMBARAZO/i.test(tNorm);
  if (!hasPIEInmuno && !hasPrueba) return '';

  if (hasPIEInmuno) {
    var idx = tNorm.toUpperCase().indexOf('PRUEBA INMUNOLOGICA DE EMBARAZO');
    var sub = tNorm.substring(idx, idx + 400);
    var subUp = sub.toUpperCase();
    // Preferir resultado del bloque SUERO (más confiable clínicamente)
    var sueroIdx = subUp.indexOf('SUERO');
    var m = null;
    if (sueroIdx !== -1) {
      m = sub.substring(sueroIdx, sueroIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    // Fallback: buscar en bloque ORINA
    if (!m) {
      var orinaIdx = subUp.indexOf('ORINA');
      if (orinaIdx !== -1) m = sub.substring(orinaIdx, orinaIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    if (!m) return '';
    return 'PIE\t' + m[1].toUpperCase() + '*';
  }

  // Formato original: "PRUEBA DE EMBARAZO"
  var idx = tNorm.toUpperCase().indexOf('PRUEBA DE EMBARAZO');
  var sub = tNorm.substring(idx, idx + 300);
  var m = sub.match(/\b(NEGATIVO|POSITIVO)\b/i);
  if (!m) return '';
  return 'PIE\t' + m[1].toUpperCase() + '*';
}

export function parsearLCR(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf('CITOQUIMICO DE LCR')===-1 && tUp.indexOf('CITOQUIMICO LIQ. LCR')===-1 && tUp.indexOf('CITOQUIMICO LCR')===-1) return '';
  var lineas = textoBruto.split(/\r?\n/).map(function(l){return l.trim();});
  var pH='',aspecto='',leu='',glu='',prot='',cl='',gram='',tinta='';
  for (var i=0; i<lineas.length; i++) {
    var linUp=lineas[i].toUpperCase();
    if (linUp.indexOf('PH')===0){for(var j=i+1;j<Math.min(i+4,lineas.length);j++){var m=lineas[j].match(/(\d+(\.\d+)?)/);if(m){pH=m[1];break;}}}
    if (linUp.indexOf('ASPECTO')===0){for(var j=i+1;j<Math.min(i+4,lineas.length);j++){var txt=lineas[j].replace(/\*/g,'').trim();if(txt&&!/ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA/i.test(txt)){aspecto=txt.toUpperCase();break;}}}
    if (linUp.indexOf('RECUENTO CELULAR')===0||linUp.indexOf('LEUCOCITOS')===0){for(var j=i+1;j<Math.min(i+5,lineas.length);j++){var m=lineas[j].match(/(\d+)\s*$/);if(m){leu=m[1];break;}}}
    if (linUp.indexOf('GLUCOSA')===0){for(var j=i+1;j<Math.min(i+4,lineas.length);j++){var m=lineas[j].match(/(\d+(\.\d+)?)/);if(m){glu=m[1];break;}}}
    if (linUp.indexOf('PROTEINAS')===0){var mL=lineas[i].match(/PROTEINAS\s*([A-Z])\s*$/i);var letra=mL?mL[1].toUpperCase():'';for(var j=i+1;j<Math.min(i+4,lineas.length);j++){var m=lineas[j].match(/(\d+(\.\d+)?)/);if(m){prot=m[1]+letra;break;}}}
    if (linUp.indexOf('CLORURO')===0){for(var j=i+1;j<Math.min(i+4,lineas.length);j++){var m=lineas[j].match(/(\d+(\.\d+)?)/);if(m){cl=m[1];break;}}}
    if (linUp.indexOf('GRAM')===0){for(var j=i+1;j<Math.min(i+4,lineas.length);j++){var txt=lineas[j].replace(/\*/g,'').trim();if(txt){gram=txt.toUpperCase();break;}}}
    if (linUp.indexOf('TINTA CHINA')===0){for(var j=i+1;j<Math.min(i+4,lineas.length);j++){var txt=lineas[j].replace(/\*/g,'').trim();if(txt){tinta=txt.toUpperCase();break;}}}
  }
  if (!aspecto&&!leu&&!glu&&!prot&&!cl&&!gram&&!tinta) return '';
  var p=['LCR:'];
  if(pH)     p.push('pH',pH);
  if(aspecto)p.push('Asp',aspecto);
  if(leu)    p.push('Leu',leu);
  if(glu)    p.push('Glu',glu);
  if(prot)   p.push('Prot',prot);
  if(cl)     p.push('Cl',cl);
  if(gram)   p.push('Gram',gram);
  if(tinta)  p.push('Tinta',tinta);
  return p[0]+'\t'+p.slice(1).join(' ');
}

/** Texto completo desde 1.ª aparición hasta fin del 2.º tramo (incluye BACTERIOLOGIA intermedia). */
function bloqueCitoquimicoLiquidosFull(textoBruto) {
  var t = textoBruto.replace(/\r/g, '');
  var u = t.toUpperCase();
  var key = 'CITOQUIMICO DE LIQUIDOS CORPORALES';
  var i0 = u.indexOf(key);
  if (i0 === -1) return '';
  var i2 = u.indexOf(key, i0 + key.length);
  if (i2 === -1) return t.substring(i0);
  var afterSecond = t.substring(i2 + key.length);
  var stop = afterSecond.search(/\n\n\s*(?:QUIMICA CLINICA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA)\b/i);
  var end = stop === -1 ? t.length : i2 + key.length + stop;
  return t.substring(i0, end);
}

/** mg/dL del laboratorio → g/dL para ratios (p. ej. 6000→6, 300→3). */
export function normalizarProteinasFluidoGdl_(valStr) {
  var n = toNum_(String(valStr || '').replace(/[A-Z*]$/i, ''));
  if (n == null) return null;
  if (n >= 1000) return n / 1000;
  if (n >= 100) return n / 100;
  return n;
}

export function esLiquidoPleural_(fluid, com, bloque) {
  var s = ((fluid || '') + ' ' + (com || '') + ' ' + (bloque || '')).toUpperCase();
  return /\bPLEURAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PLEURAL\b/.test(s);
}

/**
 * Criterios de Light: exudado si ≥1 de Prot/ProtS>0.5, LDH/LDHS>0.6, LDHpleural>2/3 ULN LDH sérica.
 * TRASUDADO solo si los tres criterios aplicables fueron evaluados y ninguno es positivo.
 */
export function evaluarCriteriosLight_(pleuralProtGdl, pleuralLdh, serumProtGdl, serumLdh, serumLdhUln) {
  var hits = [];
  var details = [];
  var nProt = 0;
  var nLdh = 0;
  var nUln = 0;

  if (pleuralProtGdl != null && serumProtGdl != null && serumProtGdl > 0) {
    nProt = 1;
    var r1 = pleuralProtGdl / serumProtGdl;
    var ok1 = r1 > 0.5;
    if (ok1) hits.push('prot');
    details.push('Prot ' + r1.toFixed(2) + (ok1 ? '' : '−'));
  }
  if (pleuralLdh != null && serumLdh != null && serumLdh > 0) {
    nLdh = 1;
    var r2 = pleuralLdh / serumLdh;
    var ok2 = r2 > 0.6;
    if (ok2) hits.push('ldh');
    details.push('LDH ' + r2.toFixed(2) + (ok2 ? '' : '−'));
  }
  if (pleuralLdh != null && serumLdhUln != null && serumLdhUln > 0) {
    nUln = 1;
    var umbral = (2 / 3) * serumLdhUln;
    var ok3 = pleuralLdh > umbral;
    if (ok3) hits.push('ldhUln');
    details.push('LDH>2/3' + (ok3 ? '' : '−'));
  }

  var nEval = nProt + nLdh + nUln;
  if (!nEval || !details.length) return '';

  if (hits.length > 0) return 'Light EXUDADO (' + details.join(', ') + ')';
  if (nProt && nLdh && nUln) return 'Light TRASUDADO (' + details.join(', ') + ')';
  return 'Light TRASUDADO parcial (' + details.join(', ') + ')';
}

function extraerSueroParaLight_(textoBruto, bloqueCito) {
  var t = textoBruto || '';
  if (bloqueCito) t = t.replace(bloqueCito, ' ');
  var protData = extraerConRangoSuero(
    ['PROTEINAS TOTALES EN SANGRE', 'PROTEINAS TOTALES', 'PROTEINA TOTAL EN SANGRE', 'PROTEINAS EN SANGRE'],
    t
  );
  var ldhData = extraerConRangoSuero(['LDH DESHIDROGENASA LACTICA', 'LDH '], t);
  return {
    protGdl: normalizarProteinasFluidoGdl_(protData.valor),
    ldh: toNum_(ldhData.valor),
    ldhUln: ldhData.max != null ? ldhData.max : null,
  };
}

function normalizarRecuentoCelular_(valStr) {
  var c = String(valStr || '').replace(/\*/g, '').trim();
  if (/^\d{1,3},\d{3}$/.test(c)) return c.replace(',', '');
  return c.replace(',', '.');
}

function fmtProteinaFluido_(valStr) {
  var g = normalizarProteinasFluidoGdl_(valStr);
  if (g == null) return String(valStr || '').replace(/[A-Z*]$/i, '');
  var star = /[A-Z*]$/.test(String(valStr || ''));
  var s = g >= 10 ? String(Math.round(g * 10) / 10) : String(Math.round(g * 100) / 100);
  return s + (star ? '*' : '');
}

function buildLightPleural_(bloque, pleuralProtRaw, pleuralLdhRaw, textoBruto) {
  var pleuralProt = normalizarProteinasFluidoGdl_(pleuralProtRaw);
  var pleuralLdh = toNum_(pleuralLdhRaw);
  if (pleuralProt == null && pleuralLdh == null) return '';

  var suero = extraerSueroParaLight_(textoBruto, bloque);
  var ldhUln = suero.ldhUln;
  if (ldhUln == null && bloque) {
    var ldhRef = extraerConRango(['LDH DESHIDROGENASA LACTICA', 'LDH '], bloque);
    if (ldhRef.max != null) ldhUln = ldhRef.max;
  }

  return evaluarCriteriosLight_(pleuralProt, pleuralLdh, suero.protGdl, suero.ldh, ldhUln);
}

/**
 * Citoquímico de líquidos corporales (ascitis, pleural, peritoneal, etc.).
 * No confundir con LCR (parsearLCR).
 */
export function parsearCitoquimicoLiquidos(textoBruto) {
  var bloque = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloque) return '';
  var lineas = bloque.split(/\r?\n/).map(function(l) { return l.trim(); });
  var fluid = '', dens = '', pH = '', glu = '', prot = '', ldh = '', alb = '', aspecto = '', leu = '',
    rec = '', pmn = '', linf = '', eri = '', gram = '', com = '';
  function nextMeaningful(i0, maxJ) {
    for (var j = i0 + 1; j < Math.min(i0 + maxJ, lineas.length); j++) {
      var txt = lineas[j].replace(/\*/g, '').trim();
      if (!txt) continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      return txt;
    }
    return '';
  }
  for (var i = 0; i < lineas.length; i++) {
    var lin = lineas[i];
    var linUp = lin.toUpperCase();
    if (/^CITOQUIMICO DE\s*$/i.test(lin) && !/CORPORALES/i.test(lin)) {
      var f = nextMeaningful(i, 6);
      if (f && !/^:$/.test(f)) fluid = f.toUpperCase();
    }
    if (/^CITOQUIMICO DE\s+/i.test(lin) && !/CORPORALES/i.test(lin)) {
      var mTipo = lin.match(/^CITOQUIMICO DE\s+(.+)$/i);
      if (mTipo && mTipo[1].trim()) fluid = mTipo[1].trim().toUpperCase();
    }
    if (linUp.indexOf('DENSIDAD') === 0) {
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+\.\d+|\d+)/);
        if (m) { dens = m[1]; break; }
      }
    }
    if (linUp === 'PH' || linUp.indexOf('PH\t') === 0) {
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) { pH = m[1]; break; }
      }
    }
    if (linUp.indexOf('GLUCOSA') === 0) {
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) { glu = m[1]; break; }
      }
    }
    if (linUp.indexOf('PROTEINAS') === 0) {
      var mL = lin.match(/PROTEINAS\s*([A-Z])\s*$/i);
      var letra = mL ? mL[1].toUpperCase() : '';
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) { prot = m[1] + letra; break; }
      }
    }
    if (linUp.indexOf('LDH') === 0) {
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, '').trim();
        if (/^[A-Z]$/i.test(c)) continue;
        var m = c.match(/(\d+(\.\d+)?)/);
        if (m) { ldh = m[1]; break; }
      }
    }
    if (linUp.indexOf('ALBUMINA') === 0) {
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, '').trim();
        if (/^[A-Z]$/i.test(c)) continue;
        var m = c.match(/(\d+(\.\d+)?)/);
        if (m) { alb = m[1]; break; }
      }
    }
    if (linUp.indexOf('ASPECTO') === 0) {
      var a = nextMeaningful(i, 5);
      if (a && !/^:$/.test(a)) aspecto = a.toUpperCase();
    }
    if (linUp.indexOf('RECUENTO') === 0 && linUp.indexOf('LEUCOCITOS') === -1) {
      var bits = [];
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var c = lineas[j].replace(/\*/g, '').trim();
        if (!c) continue;
        if (/^LEUCOCITOS/i.test(c)) break;
        if (/^\d+[.,]?\d*$/.test(c) || /^[A-Z]$/i.test(c)) bits.push(c.toUpperCase());
        if (bits.length >= 2) break;
      }
      if (bits.length) rec = bits.join(' ');
    }
    if (/^LEUCOCITOS/i.test(linUp)) {
      for (var j = i - 1; j >= Math.max(0, i - 6); j--) {
        var c = lineas[j].replace(/\*/g, '').trim();
        if (/^\d+[.,]?\d*$/.test(c)) { leu = normalizarRecuentoCelular_(c); break; }
      }
      if (!leu) {
        for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
          var c = lineas[j].replace(/\*/g, '').trim();
          if (/^\d+[.,]?\d*$/.test(c)) { leu = normalizarRecuentoCelular_(c); break; }
        }
      }
    }
    if (linUp.indexOf('POLIMORFONUCLEARES') === 0) {
      var ptxt = nextMeaningful(i, 5);
      if (ptxt) pmn = ptxt.toUpperCase();
    }
    if (linUp.indexOf('LINFOCITOS') === 0) {
      var ltxt = nextMeaningful(i, 5);
      if (ltxt && ltxt !== '%' && ltxt !== '---') linf = ltxt.replace(',', '.');
    }
    if (linUp.indexOf('ERITROCITOS') === 0) {
      var etxt = nextMeaningful(i, 5);
      if (etxt) eri = etxt.toUpperCase();
    }
    if (linUp.indexOf('GRAM') === 0) {
      var g = nextMeaningful(i, 5);
      if (g) gram = g.toUpperCase();
    }
    if (linUp.indexOf('COMENTARIO') === 0) {
      var cx = nextMeaningful(i, 4);
      if (cx && !/^\*+$/.test(cx)) com = cx.toUpperCase();
    }
  }
  if (!fluid && com && /\bPLEURAL\b/i.test(com)) fluid = com;
  if (!fluid && esLiquidoPleural_(fluid, com, bloque)) fluid = 'LIQUIDO PLEURAL';

  if (!fluid && !dens && !pH && !glu && !prot && !ldh && !alb && !aspecto && !leu && !rec && !pmn && !linf && !eri && !gram && !com) return '';

  var esPleural = esLiquidoPleural_(fluid, com, bloque);
  var lightTxt = esPleural ? buildLightPleural_(bloque, prot, ldh, textoBruto) : '';

  var p = ['Liq:'];
  if (fluid) p.push('Tipo', fluid);
  if (dens) p.push('Dens', dens);
  if (pH) p.push('pH', pH);
  if (glu) p.push('Glu', glu);
  if (prot) p.push('Prot', fmtProteinaFluido_(prot));
  if (alb) p.push('Alb', alb);
  if (ldh) p.push('LDH', ldh);
  if (aspecto) p.push('Asp', aspecto);
  if (rec) p.push('Rec', rec);
  if (leu) p.push('Leu', leu);
  if (pmn && pmn !== '---') p.push('PMN', pmn);
  if (linf) p.push('Linf', linf + (/%/.test(linf) ? '' : '%'));
  if (eri) p.push('Eri', eri);
  if (gram) p.push('Gram', gram);
  if (com && com !== fluid) p.push('Obs', com);
  if (lightTxt) p.push(lightTxt);
  return p[0] + '\t' + p.slice(1).join(' ');
}

export function parseFisicoquimicoHeces_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') return '';
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf('FISICOQUIMICO DE HECES') === -1) return '';

  var lineas = textoBruto.split(/\r?\n/).map(function (l) {
    return String(l || '').trim();
  });
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf('FISICOQUIMICO DE HECES') !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return '';

  var i1 = lineas.length;
  for (var j = i0 + 1; j < lineas.length; j++) {
    if (
      /^(BACTERIOLOGIA|HEMATOLOGIA|QUIMICA CLINICA|INMUNOLOGIA|GASOMETRIA|COAGULACION|URIANALISIS|EXAMEN GENERAL DE ORINA|CULTIVO)\b/i.test(
        lineas[j]
      )
    ) {
      i1 = j;
      break;
    }
  }
  var bloque = lineas.slice(i0, i1);

  function nextMeaningful(iStart, maxStep) {
    for (var k = iStart + 1; k < Math.min(iStart + maxStep, bloque.length); k++) {
      var txt = (bloque[k] || '').replace(/\*/g, '').trim();
      if (!txt || txt === ':') continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      return txt;
    }
    return '';
  }
  function nextMeaningfulText(iStart, maxStep) {
    for (var k = iStart + 1; k < Math.min(iStart + maxStep, bloque.length); k++) {
      var txt = (bloque[k] || '').replace(/\*/g, '').trim();
      if (!txt || txt === ':') continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      if (/^\d+(\.\d+)?$/.test(txt)) continue;
      return txt;
    }
    return '';
  }

  var rows = [
    { key: 'ASPECTO', out: 'Asp' },
    { key: 'PH', out: 'pH' },
    { key: 'PROTEINAS', out: 'Prot' },
    { key: 'GLUCOSA', out: 'Glu' },
    { key: 'LEUCOCITOS', out: 'Leu' },
    { key: 'ERITROCITOS', out: 'Eri' },
    { key: 'GRASA', out: 'Grasa' },
    { key: 'FIBRAS MUSCULARES', out: 'Fibra' },
    { key: 'COPROPARASITOSCOPICO INMEDIATO', out: 'Copro' },
    { key: 'OBSERVACIONES', out: 'Obs' }
  ];

  var p = ['HECES'];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    for (var bi = 0; bi < bloque.length; bi++) {
      if (bloque[bi].toUpperCase().indexOf(row.key) !== 0) continue;
      var v = nextMeaningful(bi, 7);
      if (row.key === 'ASPECTO' && /^\d+(\.\d+)?$/.test(v)) {
        var v2 = nextMeaningfulText(bi, 10);
        if (v2) v = v + ' ' + v2;
      }
      if (!v) break;
      p.push(row.out, v.toUpperCase());
      break;
    }
  }

  if (p.length <= 1) return '';
  return p[0] + '\t' + p.slice(1).join(' ');
}

export function parseFrotisSangre_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') return '';
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf('FROTIS DE SANGRE PERIFERICA') === -1) return '';

  var lineas = textoBruto.split(/\r?\n/).map(function (l) {
    return String(l || '').trim();
  });
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf('FROTIS DE SANGRE PERIFERICA') !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return '';

  function nextMeaningful(iStart, maxStep) {
    for (var j = iStart + 1; j < Math.min(iStart + maxStep, lineas.length); j++) {
      var txt = (lineas[j] || '').replace(/\*/g, '').trim();
      if (!txt || txt === ':') continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      if (/^FROTIS DE SANGRE PERIFERICA$/i.test(txt)) continue;
      return txt;
    }
    return '';
  }

  var desc = '';
  for (var k = i0; k < Math.min(i0 + 20, lineas.length); k++) {
    if (lineas[k].toUpperCase().indexOf('FROTIS DE SANGRE PERIFERICA') !== 0) continue;
    desc = nextMeaningful(k, 8);
    if (desc) break;
  }
  if (!desc) return '';
  return 'FROTIS\tObs ' + desc.toUpperCase();
}

/** Na/K/Cl/Cr de QUIMICA CLINICA (orina); Cl suele venir en COMENTARIO DE MUESTRA. */
function extraerQuimicaOrinaParaEGO_(textoBruto) {
  var out = { na: null, k: null, cl: null, cr: null };
  if (!textoBruto) return out;
  var lineas = textoBruto.split(/\r?\n/).map(function (l) {
    return l.replace(/\*/g, '').trim();
  });
  function valorTrasEtiqueta(etiquetas) {
    for (var e = 0; e < etiquetas.length; e++) {
      var lbl = etiquetas[e].toUpperCase();
      for (var i = 0; i < lineas.length; i++) {
        if (lineas[i].toUpperCase() !== lbl) continue;
        for (var j = i + 1; j < Math.min(i + 10, lineas.length); j++) {
          var l = lineas[j].trim();
          if (!l) continue;
          if (/^[ABHL]$/.test(l)) continue;
          if (/^(N\/A|Estudio|Resultado|Unidades|Valor de Referencia|VALOR DE REF)/i.test(l)) continue;
          if (/^[\-–:\/\.]+$/.test(l)) continue;
          var mNum = l.match(/^(-?\d+[.,]?\d*)/);
          if (mNum) return mNum[1].replace(',', '.');
        }
      }
    }
    return null;
  }
  out.k = valorTrasEtiqueta(['POTASIO EN ORINA']);
  out.na = valorTrasEtiqueta(['SODIO EN ORINA']);
  out.cr = valorTrasEtiqueta(['CREATININA EN ORINA']);
  var mCl = textoBruto.match(/CLORO\s+EN\s+ORINA\s*:?\s*(\d+[.,]?\d*)/i);
  if (mCl) out.cl = mCl[1].replace(',', '.');
  return out;
}

export function parseEGO_(textoBruto) {
  var qOrina = extraerQuimicaOrinaParaEGO_(textoBruto);
  var hasQO = !!(qOrina.na || qOrina.k || qOrina.cl || qOrina.cr);

  var tUp=textoBruto.toUpperCase();
  var pos=tUp.indexOf('EXAMEN GENERAL DE ORINA')!==-1?tUp.indexOf('EXAMEN GENERAL DE ORINA'):
          tUp.indexOf('ANALISIS DE ORINA')!==-1?tUp.indexOf('ANALISIS DE ORINA'):
          tUp.indexOf('URIANALISIS')!==-1?tUp.indexOf('URIANALISIS'):-1;
  var lineas;
  if (pos === -1) {
    if (!hasQO) return '';
    lineas = [];
  } else {
    var fin = tUp.search(/BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA/);
    var bloque = (fin !== -1 && fin > pos) ? textoBruto.substring(pos, fin) : textoBruto.substring(pos);
    lineas = bloque.split(/\r?\n/).map(function (l) { return l.replace(/\*/g, '').trim(); });
  }
  function esUnidad(l){return /^(Hem\/uL|Leucocitos\/uL|E\.U\.\/dL|mOsm\/L|mg\/dL|mmol\/L|g\/dL|\/CAMPO|K\/uL|fL|pg|uL|U\/L|SEG\.?)$/i.test(l)||/^[a-zA-Z]+\/[a-zA-Z]+$/.test(l);}
  function buscarValor(nombres){
    for(var n=0;n<nombres.length;n++)for(var i=0;i<lineas.length;i++)if(lineas[i].toUpperCase()===nombres[n].toUpperCase()){
      for(var j=i+1;j<Math.min(i+8,lineas.length);j++){var l=lineas[j].trim();
        if(!l)continue;if(/^[ABHL]$/.test(l))continue;if(/^[:\-\/\.\s]+$/.test(l))continue;
        if(/^(N\/A|EstudioResultado|ESTUDIO|SEDIMENTO|QUIMICO|FISICO|MICROSCOPICO|URIANALISIS|EXAMEN GENERAL|OBSERVACIONES)/i.test(l))continue;
        var mApr=l.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/i);if(mApr)return mApr[1];
        if(esUnidad(l))continue;if(/^\d[\d\.,]*\s+[\-–]\s+\d[\d\.,]*$/.test(l))continue;
        if(/^\d+[\-–]\d+\//.test(l))continue;if(/^\d+[\-–]\d+$/.test(l))return l;
        var mNum=l.match(/^(-?\d+[.,]?\d*)/);if(mNum)return mNum[1].replace(',','.');
        if(l.length<=30&&!/\d{4,}/.test(l)&&!/VALOR DE REF/i.test(l))return l.toUpperCase();
      }
    }
    return '---';
  }
  var color=buscarValor(['COLOR']),aspecto=buscarValor(['ASPECTO']),ph=buscarValor(['PH']),dens=buscarValor(['DENSIDAD','GRAVEDAD ESPECIFICA']);
  var prot=buscarValor(['PROTEINAS','PROTEINURIA']),glu=buscarValor(['GLUCOSA']),cet=buscarValor(['CETONAS','CUERPOS CETONICOS']);
  var bilis=buscarValor(['BILIRRUBINAS','BILIRRUBINA']),sangre=buscarValor(['SANGRE']),nitr=buscarValor(['NITRITOS']);
  var urobil=buscarValor(['UROBILINOGENO','UROBILINÓGENO']),estLeu=buscarValor(['ESTERASA LEUCOCITARIA']);
  var leu=buscarValor(['LEUCOCITOS']),eri=buscarValor(['ERITROCITOS','HEMATIES']),bact=buscarValor(['BACTERIAS']);
  var celEpit=buscarValor(['CELULAS EPITELIALES']),cilinG=buscarValor(['CILINDROS GRANOLOSOS']),cilinH=buscarValor(['CILINDROS HIALINOS']);
  var levad=buscarValor(['LEVADURAS']),moco=buscarValor(['MOCO']);
  if (!hasQO && color==='---'&&aspecto==='---'&&ph==='---'&&leu==='---'&&eri==='---')return '';
  function abreviar(val){if(!val||val==='---')return '---';var v=val.toUpperCase().trim();
    if(v==='NEGATIVO'||v==='NEGATIVE')return 'NEG';if(v==='POSITIVO'||v==='POSITIVE')return 'POS';
    if(v==='AUSENTES'||v==='AUSENTE')return 'AUS';if(v==='ESCASAS'||v==='ESCASO')return 'ESC';
    if(v==='MODERADAS'||v==='MODERADO')return 'MOD';if(v==='ABUNDANTES'||v==='ABUNDANTE')return 'ABD';
    if(v==='AMARILLO')return 'AMAR';if(v==='TURBIO')return 'TURB';if(v==='CLARO')return 'CLARO';return v;}
  function marcarEGO(val,tipo){if(!val||val==='---')return '---';var ab=abreviar(val);
    if(['PROT','GLU','CET','BILI','NITR','ESTLEU'].indexOf(tipo)!==-1)return(ab!=='NEG'&&ab!=='AUS')?ab+'*':ab;
    if(tipo==='SANG'){var v=parseFloat(val);if(!isNaN(v))return v>0?val+'*':'NEG';return(ab!=='NEG'&&ab!=='AUS')?ab+'*':ab;}
    if(tipo==='UROBIL'){var v=parseFloat(val);return(!isNaN(v)&&v>1)?ab+'*':ab;}
    if(tipo==='PH'){var v=parseFloat(val);return(!isNaN(v)&&(v<5.5||v>6.5))?ab+'*':ab;}
    if(tipo==='DENS'){var v=parseFloat(val);return(!isNaN(v)&&(v<1.005||v>1.025))?ab+'*':ab;}
    if(tipo==='LEU'){var mR=val.match(/^(\d+)[\-–](\d+)$/);if(mR)return parseInt(mR[1])>5?ab+'*':ab;var v=parseFloat(val);return(!isNaN(v)&&v>5)?ab+'*':ab;}
    if(tipo==='ERI'){var mR=val.match(/^(\d+)[\-–](\d+)$/);if(mR)return parseInt(mR[1])>2?ab+'*':ab;var v=parseFloat(val);return(!isNaN(v)&&v>2)?ab+'*':ab;}
    if(['BACT','CELEP','CLING','CLINH','LEVAD','MOCO'].indexOf(tipo)!==-1)return(ab!=='AUS')?ab+'*':ab;return ab;}
  var fisico=[],quimico=[],sedimento=[];
  if(color!=='---')fisico.push(marcarEGO(color,'COLOR'));if(aspecto!=='---')fisico.push(marcarEGO(aspecto,'ASPECTO'));
  if(ph!=='---')fisico.push('pH '+marcarEGO(ph,'PH'));if(dens!=='---')fisico.push('D '+marcarEGO(dens,'DENS'));
  if(prot!=='---')quimico.push('Prot '+marcarEGO(prot,'PROT'));if(glu!=='---')quimico.push('Glu '+marcarEGO(glu,'GLU'));
  if(cet!=='---')quimico.push('Cet '+marcarEGO(cet,'CET'));if(bilis!=='---')quimico.push('Bili '+marcarEGO(bilis,'BILI'));
  if(sangre!=='---')quimico.push('Sang '+marcarEGO(sangre,'SANG'));if(nitr!=='---')quimico.push('Nitr '+marcarEGO(nitr,'NITR'));
  if(urobil!=='---')quimico.push('Urobil '+marcarEGO(urobil,'UROBIL'));if(estLeu!=='---')quimico.push('EstLeu '+marcarEGO(estLeu,'ESTLEU'));
  if(leu!=='---')sedimento.push('Leu '+marcarEGO(leu,'LEU'));if(eri!=='---')sedimento.push('Eri '+marcarEGO(eri,'ERI'));
  if(bact!=='---'&&abreviar(bact)!=='AUS')sedimento.push('Bact '+marcarEGO(bact,'BACT'));
  if(celEpit!=='---'&&abreviar(celEpit)!=='AUS')sedimento.push('CelEp '+marcarEGO(celEpit,'CELEP'));
  if(cilinG!=='---'&&abreviar(cilinG)!=='AUS')sedimento.push('CilinG '+marcarEGO(cilinG,'CLING'));
  if(cilinH!=='---'&&abreviar(cilinH)!=='AUS')sedimento.push('CilinH '+marcarEGO(cilinH,'CLINH'));
  if(levad!=='---'&&abreviar(levad)!=='AUS')sedimento.push('Levad '+marcarEGO(levad,'LEVAD'));
  if(moco!=='---'&&abreviar(moco)!=='AUS')sedimento.push('Moco '+marcarEGO(moco,'MOCO'));
  if (qOrina.na) quimico.push('NaU ' + qOrina.na);
  if (qOrina.k) quimico.push('KU ' + qOrina.k);
  if (qOrina.cl) quimico.push('ClU ' + qOrina.cl);
  if (qOrina.cr) quimico.push('CrU ' + qOrina.cr);
  if(!fisico.length&&!quimico.length&&!sedimento.length)return '';
  var sub=['EGO:'];
  if(fisico.length)sub.push('  '+fisico.join('  '));
  if(quimico.length)sub.push('  '+quimico.join('  '));
  if(sedimento.length)sub.push('  '+sedimento.join('  '));
  return sub.join('\n');
}

export function parseCuantOrina_(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  var startIdx = tUp.indexOf('CUANTIFICACION PROTEINAS');
  if (startIdx === -1) return '';

  var bloque = textoBruto.substring(startIdx);
  var nextSec = bloque.search(/\n(?:HEMATOLOGIA|BACTERIOLOGIA|CULTIVO|EXAMEN GENERAL|GASOMETRIA|BIOMETRIA)\b/i);
  if (nextSec > 0) bloque = bloque.substring(0, nextSec);

  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, '').replace(/\t.*/, '').trim();
  });

  var vol = '---', res = '---';
  var tipo = /orina\s+de\s+12/i.test(bloque) ? '12h' : '24h';

  for (var i = 0; i < lineas.length; i++) {
    var lUp = lineas[i].toUpperCase();

    if (lUp.indexOf('VOLUMEN') !== -1) {
      for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
        var v = lineas[j];
        if (!v || /^[A-Z]$/.test(v)) continue;
        var m = v.match(/^(\d+\.?\d*)/);
        if (m) { vol = m[1]; break; }
      }
    }

    if (lUp === 'RESULTADO') {
      for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
        var v = lineas[j];
        if (!v || /^[A-Z]$/.test(v)) continue;
        var m = v.match(/^(\d+\.?\d*)/);
        if (m) { res = m[1]; break; }
      }
    }
  }

  if (res === '---') return '';
  var parts = ['Prot' + tipo];
  if (vol !== '---') parts.push('Vol ' + vol + 'ml');
  parts.push(res + '*'); // reference is NEGATIVO — always abnormal
  parts.push('gr/vol');
  return parts[0] + '\t' + parts.slice(1).join(' ');
}

function detectTipoCultivoLine(lineasTexto) {
  var idxBact = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    if (/BACTERIOLOGIA/i.test(lineasTexto[i])) { idxBact = i; break; }
  }
  if (idxBact === -1) return '';
  var candidate = '';
  for (var i = idxBact + 1; i < Math.min(idxBact + 35, lineasTexto.length); i++) {
    var l = lineasTexto[i].replace(/\r/g, '').replace(/\*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!l) continue;
    var lUp = l.toUpperCase();
    if (/^BACTERIOLOGIA$/.test(lUp)) continue;
    if (/^ESTUDIO\b/.test(lUp)) continue;
    if (/^RESULTADO$/.test(lUp) || /^UNIDADES$/.test(lUp) || /^VALOR DE REFERENCIA$/.test(lUp)) continue;
    if (/^PRODUCTO$/.test(lUp)) break;
    if (/\bUROCULTIVO\b/i.test(l) || /\bHEMOCULTIVO\b/i.test(l) || /^CATETER(\b|$)/i.test(lUp))
      return l;
    if (!candidate && !/^(TINCION|CALIDAD|ESTADO|MICROORGANISMO|COMENTARIO|CUENTA|ANTIBIOGRAMA)\b/i.test(lUp)) {
      candidate = l;
    }
  }
  return candidate;
}

function detectMuestraDesdeProducto(lineasTexto) {
  var idxProd = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    if (lineasTexto[i].toUpperCase().indexOf('PRODUCTO') !== -1) { idxProd = i; break; }
  }
  if (idxProd === -1) return '';
  for (var j = idxProd + 1; j < Math.min(idxProd + 14, lineasTexto.length); j++) {
    var s = lineasTexto[j].replace(/\r/g, '').replace(/\*/g, '').trim();
    if (!s) continue;
    if (/^TINCION(\s+DE)?\s*GRAM/i.test(s)) break;
    if (/^CALIDAD DE LA MUESTRA$/i.test(s)) break;
    if (/^ESTADO DE CULTIVO$/i.test(s)) break;
    if (/^REPORTE PRELIMINAR$/i.test(s)) break;
    if (/^MICROORGANISMO$/i.test(s)) break;
    if (/^COMENTARIO/i.test(s)) break;
    return s;
  }
  return '';
}

function buildCultivoTipoDisplay(tipoLine, muestra) {
  var t = tipoLine ? tipoLine.replace(/\s+/g, ' ').trim().toUpperCase() : '';
  var m = muestra ? muestra.replace(/\s+/g, ' ').trim().toUpperCase() : '';
  if (t && m) return t + ' (' + m + ')';
  if (t) return t;
  if (m) return 'CULTIVO (' + m + ')';
  return 'CULTIVO';
}

function parseInterpAntibiograma(vL) {
  var vClean = vL.replace(/\*+$/g, '').trim();
  if (!vClean) return null;
  var tabs = vClean.split(/\t+/).map(function(x) { return x.trim(); }).filter(Boolean);
  if (tabs.length >= 2) {
    var interp = tabs[tabs.length - 1].toUpperCase().replace(/\*+$/, '');
    var mic = tabs.slice(0, -1).join(' ').trim();
    if (/^(S|R|I|NEG|POS|ESBL|BLEE|KPC|NDM|VIM|IMP|MBL)$/.test(interp)) return { mic: mic, interp: interp };
    if (/^NO\s+SUSCEPTIBLE$/i.test(interp)) return { mic: mic, interp: 'NO SUSCEPTIBLE' };
  }
  var mV = vClean.match(/^([<>]=?\s*\d+(?:\.\d+)?)\s+(S|R|I|NEG|POS|ESBL|BLEE|KPC|NDM|VIM|IMP|MBL)$/i);
  if (mV) return { mic: mV[1].replace(/\s/g, ''), interp: mV[2].toUpperCase() };
  var mN = vClean.match(/^(\d+)\s+(S|R|I|ESBL|BLEE|KPC|NDM|VIM|IMP|MBL)$/i);
  if (mN) return { mic: mN[1], interp: mN[2].toUpperCase() };
  var lim = vClean.toUpperCase();
  if (/^(S|R|I)$/.test(lim)) return { mic: '', interp: lim };
  if (/NO\s+SUSCEPTIBLE/i.test(vClean)) return { mic: '', interp: 'NO SUSCEPTIBLE' };
  return null;
}

/** Orden de visualización: carbapenemasas y mecanismos graves primero. */
var ORDEN_MARCA_RESISTENCIA = {
  KPC: 1, NDM: 2, VIM: 3, IMP: 4, 'OXA-48': 5, 'OXA-otras': 6, MBL: 7, SPM: 8, GIM: 9,
  ESBL: 20, BLEE: 21, CRE: 30, 'Carb-R': 31, AmpC: 40, MRSA: 50, VRE: 51, 'Col-R': 52,
};

/**
 * Detecta mecanismos y fenotipos de resistencia en texto de bacteriología (comentarios, notas, MALDI).
 * Incluye carbapenemasas (KPC, NDM, OXA-48, VIM, IMP, MBL…), ESBL/BLEE, CRE, AmpC, MRSA/VRE, colistin R.
 */
function extractMarcasResistenciaDesdeTexto(texto) {
  var u = texto.toUpperCase().replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U');
  var seen = {};
  var tags = [];
  function add(tag) {
    if (!tag || seen[tag]) return;
    seen[tag] = 1;
    tags.push(tag);
  }
  if (/\bKPC\b|KPC-/.test(u)) add('KPC');
  if (/\bNDM\b|NDM-/.test(u)) add('NDM');
  if (/\bVIM\b|VIM-/.test(u)) add('VIM');
  if (/\bIMP-\d|\bIMP\s*1\b|\bIMP1\b/.test(u) || /BETALACTAMASA\s+IMP/.test(u)) add('IMP');
  if (/\bOXA[- ]?48\b|OXA48\b/.test(u)) add('OXA-48');
  if (/\bOXA[- ]?(23|24|51|58)(?![0-9])\b/i.test(u)) add('OXA-otras');
  if (/\bMBL\b|METALO\s*BETA|METALOCARBAPENEMAS|METALO-?\s*BETALACTAMASA|BETALACTAMASA\s+DE\s+ZINC/.test(u)) add('MBL');
  if (/\bSPM\b|SPM-/.test(u)) add('SPM');
  if (/\bGIM\b|GIM-/.test(u)) add('GIM');
  if (/\bCPE\b|\bCRE\b|ENTEROBACTER(I)?A\s+RESISTENTE\s+A\s+CARBAPEN|BACILO\s+CARBAPEN/.test(u)) add('CRE');
  if (/RESISTEN(CIA|TE)\s+.*CARBAPEN|CARBAPEN.*RESIST|NO\s+SUSCEPTIB.*CARBAPEN|ANTICARBAPEN|ANTI-?CARBAPEN|PRODUCTOR\s+DE\s+CARBAPENEMASA|PRODUCTOR(ES)?\s+CARBAPEN/.test(u)) {
    if (!seen.KPC && !seen.NDM && !seen.VIM && !seen.IMP && !seen['OXA-48'] && !seen.MBL) add('Carb-R');
  }
  if (/\bESBL\b|BETALACTAMASAS?\s+DE\s+ESPECTRO|ESPECTRO\s+EXTENDIDO|BLEE\s*\+\s*ESBL/.test(u)) add('ESBL');
  if (/\(BLEE\)|\bBLEE\b|BETALACTAMASAS?\s*\(?BLEE\)?|PRODUCTOR\s+DE\s+BETALACTAMASAS(?!\s+DE\s+ESPECTRO)/.test(u)) add('BLEE');
  if (/\bAMPC\b|AMP\s*C\b|BETALACTAMASA\s+AMPC|CEPHAMYCIN/.test(u)) add('AmpC');
  if (/\bMECA\b|\bMRSA\b|METICILIN(A)?\s*-?\s*RESIST|OXACILIN(A)?\s*:\s*R(?!\s*\d)/.test(u)) add('MRSA');
  if (/\bVRE\b|VANCOMICIN(A)?\s*-?\s*RESIST|ENTEROCOC.*VANCO\s*R|VANCO\s*[-–]\s*R/.test(u)) add('VRE');
  if (/COLISTIN(A)?\s*[-–:]?\s*R|POLIMIXIN(A)?\s*[-–:]?\s*R|RESIST.*COLISTIN/.test(u)) add('Col-R');
  tags.sort(function(a, b) {
    return (ORDEN_MARCA_RESISTENCIA[a] || 99) - (ORDEN_MARCA_RESISTENCIA[b] || 99);
  });
  return tags;
}

function detectMarcasResistenciaCultivo(lineasTexto) {
  var b0 = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    if (/BACTERIOLOGIA/i.test(lineasTexto[i])) { b0 = i; break; }
  }
  var slice = b0 === -1 ? lineasTexto : lineasTexto.slice(b0, Math.min(b0 + 280, lineasTexto.length));
  var blob = slice.join('\n');
  var marcas = extractMarcasResistenciaDesdeTexto(blob);
  var seen = {};
  marcas.forEach(function(m) { seen[m] = 1; });
  var inAb = false;
  for (i = 0; i < lineasTexto.length; i++) {
    var L = lineasTexto[i].replace(/\*+$/g, '').trim();
    if (/^ANTIBIOGRAMA/i.test(L)) { inAb = true; continue; }
    if (inAb && /^MICROORGANISMO|^IDENTIFICACION/i.test(L)) { inAb = false; continue; }
    if (!inAb) continue;
    var p = parseInterpAntibiograma(L);
    if (!p || !p.interp) continue;
    var it = p.interp.toUpperCase();
    if (it === 'ESBL' && !seen.ESBL) { marcas.push('ESBL'); seen.ESBL = 1; }
    if (it === 'BLEE' && !seen.BLEE) { marcas.push('BLEE'); seen.BLEE = 1; }
    if (/^(KPC|NDM|VIM|IMP|MBL)$/.test(it) && !seen[it]) { marcas.push(it); seen[it] = 1; }
  }
  marcas.sort(function(a, b) {
    return (ORDEN_MARCA_RESISTENCIA[a] || 99) - (ORDEN_MARCA_RESISTENCIA[b] || 99);
  });
  if (marcas.indexOf('BLEE') !== -1) marcas = marcas.filter(function(m) { return m !== 'ESBL'; });
  if (marcas.some(function(m) { return /^(KPC|NDM|VIM|IMP|OXA-48|OXA-otras|MBL|SPM|GIM)$/.test(m); })) {
    marcas = marcas.filter(function(m) { return m !== 'Carb-R'; });
  }
  if (marcas.indexOf('CRE') !== -1) marcas = marcas.filter(function(m) { return m !== 'Carb-R'; });
  return marcas;
}

/**
 * Resumen ATB sin CMI: conserva R | I | ESBL/BLEE y también S para mostrar
 * el biograma completo sin los valores MIC.
 */
function compactarLineasAntibiograma(sensCrudas, abreviarFn) {
  if (!sensCrudas.length) return '';
  var rank = { R: 4, 'NO SUSCEPTIBLE': 4, ESBL: 4, BLEE: 4, KPC: 4, NDM: 4, VIM: 4, IMP: 4, MBL: 4, I: 2, S: 1, POS: 1 };
  var byKey = {};
  sensCrudas.forEach(function(s) {
    var key = abreviarFn(s.med);
    if (!key) return;
    var it = String(s.interp || '').toUpperCase();
    var r = rank[it] || 0;
    if (!byKey[key] || r > byKey[key]._r) byKey[key] = { interp: it, _r: r };
  });
  var R = [], I = [], E = [], S = [];
  Object.keys(byKey).sort().forEach(function(k) {
    var it = byKey[k].interp;
    if (it === 'S' || it === 'POS') S.push(k);
    else if (it === 'I') I.push(k);
    else if (it === 'ESBL') E.push(k);
    else R.push(k);
  });
  function cap(arr, n) {
    if (!arr.length) return '';
    if (arr.length <= n) return arr.join(', ');
    return arr.slice(0, n).join(', ') + ' +' + (arr.length - n);
  }
  var parts = [];
  if (R.length) parts.push('R: ' + cap(R, 14));
  if (I.length) parts.push('I: ' + cap(I, 8));
  if (E.length) parts.push('ESBL: ' + cap(E, 8));
  if (S.length) parts.push('S: ' + cap(S, 18));
  if (!parts.length) return 'ATB sin interpretaciones';
  var line = 'ATB ' + parts.join(' | ');
  if (line.length <= 220) return line;
  return 'ATB ' + parts.join('\n');
}

/**
 * Texto para portapapeles: fecha del estudio, cabecera del cultivo y línea ATB condensada.
 */
export function formatCultivoCondensedForCopy(chunkText, studyDateLine) {
  var lines = [];
  var dateLine = String(studyDateLine || '').trim();
  if (dateLine && dateLine !== '—') lines.push(dateLine);
  var chunkLines = String(chunkText || '')
    .trim()
    .split(/\n/)
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  if (chunkLines[0]) lines.push(chunkLines[0]);
  for (var i = 1; i < chunkLines.length; i++) {
    if (/^ATB\b/i.test(chunkLines[i])) {
      lines.push(chunkLines[i]);
      break;
    }
  }
  return lines.join('\n');
}

/**
 * Todos los aislamientos con nombre tras MICROORGANISMO (uro/hemo polimicrobiano).
 * Corta antes del siguiente MICROORGANISMO o de la sección MALDI.
 */
export function findCultivoGermenRuns(lineasTexto) {
  var runs = [];
  for (var i = 0; i < lineasTexto.length; i++) {
    var L = lineasTexto[i].replace(/\r/g, '').replace(/\*+$/g, '').trim();
    if (!/^MICROORGANISMO(\s|$)/i.test(L)) continue;
    var germen = '';
    var nameEnd = i;
    for (var k = i + 1; k < Math.min(i + 14, lineasTexto.length); k++) {
      var cand = lineasTexto[k].replace(/\r/g, '').replace(/\*/g, '').trim();
      if (!cand) continue;
      if (/^COMENTARIO/i.test(cand)) break;
      if (/^MICROORGANISMO/i.test(cand)) break;
      if (/^ANTIBIOGRAMA/i.test(cand)) break;
      if (/^CUENTA/i.test(cand)) break;
      if (!/MALDI|IDENTIF|ESPECTROMETRIA|ESPECTRO/i.test(cand)) {
        germen = cand.toUpperCase();
        nameEnd = k;
        break;
      }
    }
    if (!germen) continue;
    var end = lineasTexto.length;
    for (var m = i + 1; m < lineasTexto.length; m++) {
      var Lm = lineasTexto[m].replace(/\r/g, '').replace(/\*+$/g, '').trim();
      if (/^MICROORGANISMO(\s|$)/i.test(Lm) && m > nameEnd) {
        end = m;
        break;
      }
      if (/^IDENTIFICACION\s+POR\s+ESPECTROMETRIA/i.test(Lm)) {
        end = m;
        break;
      }
    }
    runs.push({ germen: germen, i0: i, i1: end });
    i = end - 1;
  }
  return runs;
}

function extractCuentaKassFromLineas(sliceLines) {
  var tNorm = sliceLines.join(' ').replace(/\s+/g, ' ');
  var tUpper = tNorm.toUpperCase();
  var pCuenta = tUpper.indexOf('CUENTA DE KASS');
  if (pCuenta === -1) pCuenta = tUpper.indexOf('CUENTA');
  if (pCuenta === -1) return '';
  var fragC = tNorm.substring(pCuenta, pCuenta + 110);
  var fragBeforeAb = fragC.split(/\bANTIBIOGRAMA\b/i)[0];
  var mUfc = fragBeforeAb.match(/\+?\d[\d,]*(?:\.\d+)?\s*UFC/i);
  if (mUfc) return mUfc[0].replace(/\s+/g, '').toUpperCase();
  var mC = fragBeforeAb.match(/([<>]=?\s?\d+(\.\d+)?\s*[A-Z%\/]*)/i);
  if (mC) return mC[1].trim().toUpperCase();
  return '';
}

export function parseSensCrudasAntibiogramaSlice(lineasAb) {
  var sensCrudas = [];
  for (var i = 0; i < lineasAb.length - 1; i++) {
    var nL = lineasAb[i], vL = lineasAb[i + 1];
    if (!nL || nL.length <= 3 || /ANTIBIOGRAMA|MICROORGANISMO|COMENTARIO:?|CUENTA|PRODUCTO|ESTADO|MUESTRA|GRAM|IDENTIFICACION|ESTUDIO\s+RESULTADO/i.test(nL)) continue;
    var parsed = parseInterpAntibiograma(vL);
    if (!parsed) {
      var lim = vL.toUpperCase();
      if (/^(S|R|I)$/.test(lim)) parsed = { mic: '', interp: lim };
    }
    if (parsed && parsed.interp) sensCrudas.push({ med: nL.toUpperCase(), mic: parsed.mic, interp: parsed.interp });
  }
  return sensCrudas;
}

export function formatSensCrudasBlockForCopy(sensCrudas) {
  if (!sensCrudas || !sensCrudas.length) return '';
  var lines = [];
  sensCrudas.forEach(function (s) {
    lines.push(String(s.med || '').trim());
    var mic = String(s.mic || '').trim();
    var it = String(s.interp || '').trim().toUpperCase();
    lines.push((mic ? mic + '\t' : '') + it);
    lines.push('*');
  });
  return lines.join('\n');
}

/** Clasifica interpretación de antibiograma en buckets r | i | s. */
export function classifyAtbInterp(itRaw) {
  var u = String(itRaw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (u === 'S' || u === 'POS' || u === 'SENSIBLE' || u === 'SUSCEPTIBLE') return 's';
  if (
    u === 'I' ||
    u === 'IND' ||
    u.indexOf('INDETER') !== -1 ||
    u.indexOf('INTERMED') !== -1
  ) {
    return 'i';
  }
  return 'r';
}

/**
 * Chips compactos: solo R / I / S. title = antibiótico + CMI + interpretación original.
 */
export function buildAtbChipsHtml(sensCrudas) {
  if (!sensCrudas || !sensCrudas.length) return '';
  return sensCrudas
    .map(function (s) {
      var itTrim = String(s.interp || '').trim();
      var bucket = classifyAtbInterp(itTrim);
      var label = bucket === 's' ? 'S' : bucket === 'i' ? 'I' : 'R';
      var med = String(s.med || '').trim();
      var mic = String(s.mic || '').trim();
      var title = escTxt(
        med + (mic ? ' ' + mic : '') + (itTrim ? ' — ' + itTrim : '')
      );
      return (
        '<span class="atb-chip atb-chip--' +
        bucket +
        '" title="' +
        title +
        '" tabindex="0">' +
        escTxt(label) +
        '</span>'
      );
    })
    .join('');
}

/** Para ordenar: primer valor numérico de CMI (≤8 → 8, >=256 → 256). */
export function extractMicSortKey(micRaw) {
  var t = String(micRaw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=');
  if (!t) return NaN;
  var m = t.match(/(?:<=|>=|<|>|=)?\s*(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  return NaN;
}

function sortSensByGradeInBucket(items, bucket) {
  var arr = items.slice();
  arr.sort(function (a, b) {
    var ka = extractMicSortKey(a.mic);
    var kb = extractMicSortKey(b.mic);
    var na = isNaN(ka);
    var nb = isNaN(kb);
    if (na && nb) {
      return String(a.med || '').localeCompare(String(b.med || ''), 'es', { sensitivity: 'base' });
    }
    if (na) return 1;
    if (nb) return -1;
    if (bucket === 'r') {
      if (kb !== ka) return kb - ka;
      return String(a.med || '').localeCompare(String(b.med || ''), 'es', { sensitivity: 'base' });
    }
    if (ka !== kb) return ka - kb;
    return String(a.med || '').localeCompare(String(b.med || ''), 'es', { sensitivity: 'base' });
  });
  return arr;
}

function formatAtbDetailRowHtml(s) {
  var med = String(s.med || '').trim();
  var mic = String(s.mic || '').trim();
  var itTrim = String(s.interp || '').trim();
  var medEl = '<span class="atb-ris-drug">' + escTxt(med || '—') + '</span>';
  var chunks = [];
  if (mic) {
    chunks.push(
      '<span class="atb-ris-mic"><span class="atb-ris-mic-lbl">CMI</span> ' + escTxt(mic) + '</span>'
    );
  }
  if (itTrim) {
    chunks.push(
      '<span class="atb-ris-int atb-ris-int--' +
        escTxt(classifyAtbInterp(itTrim)) +
        '">' +
        escTxt(itTrim) +
        '</span>'
    );
  }
  var meta =
    chunks.length > 0
      ? '<span class="atb-ris-meta">' +
        chunks.join('<span class="atb-ris-meta-sep" aria-hidden="true">·</span>') +
        '</span>'
      : '';
  return (
    '<li class="atb-ris-detail-item">' +
    '<div class="atb-ris-detail-line">' +
    medEl +
    (meta ? meta : '') +
    '</div></li>'
  );
}

/**
 * Resumen antibiograma: como mucho tres letras (R, I, S), cada una una sola vez.
 * Hover / foco en cada letra abre solo el bloque correspondiente.
 */
export function buildAtbRisSummaryHtml(sensCrudas) {
  if (!sensCrudas || !sensCrudas.length) return '';
  var buckets = { r: [], i: [], s: [] };
  sensCrudas.forEach(function (s) {
    buckets[classifyAtbInterp(s.interp)].push(s);
  });
  var order = [
    { key: 'r', label: 'R', panelTitle: 'Resistencias' },
    { key: 'i', label: 'I', panelTitle: 'Indeterminado' },
    { key: 's', label: 'S', panelTitle: 'Sensible' },
  ];
  var wraps = [];
  order.forEach(function (o) {
    var list = buckets[o.key];
    if (!list.length) return;
    var sorted = sortSensByGradeInBucket(list, o.key);
    var items = sorted.map(formatAtbDetailRowHtml).join('');
    wraps.push(
      '<span class="cult-atb-ris-chip-wrap">' +
      '<span class="atb-chip atb-chip--' +
      o.key +
      '" tabindex="0" role="button">' +
      escTxt(o.label) +
      '</span>' +
      '<div class="atb-ris-hover-panel atb-ris-hover-panel--' +
      o.key +
      '" role="region" aria-label="' +
      escTxt(o.panelTitle) +
      '">' +
      '<div class="atb-ris-panel-head">' +
      escTxt(o.panelTitle) +
      '</div>' +
      '<ul class="atb-ris-detail-list">' +
      items +
      '</ul>' +
      '</div>' +
      '</span>'
    );
  });
  return (
    '<div class="cult-atb-ris-summary">' +
    '<div class="cult-atb-ris-chips" role="group" aria-label="Antibiograma (R / I / S); coloca el cursor sobre cada letra para el detalle">' +
    wraps.join('') +
    '</div>' +
    '</div>'
  );
}

/** Recupera pares antibiótico–resultado desde el informe pegado para un germen. */
export function extractSensCrudasForGermFromSource(sourceText, germQuery) {
  var q = String(germQuery || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!q || q === '—' || q === 'NEGATIVO') return null;
  var lineasTexto = String(sourceText || '').split('\n').map(function (l) {
    return l.replace(/\r/g, '');
  });
  var runs = findCultivoGermenRuns(lineasTexto);
  function matches(run) {
    var g = String(run.germen || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    if (!g) return false;
    if (g === q || q === g) return true;
    if (q.indexOf(g) !== -1 || g.indexOf(q) !== -1) return true;
    var qTok = q.split(/\s+/).filter(Boolean)[0] || '';
    var gTok = g.split(/\s+/).filter(Boolean)[0] || '';
    if (qTok.length > 3 && gTok.length > 3 && (qTok === gTok || q.indexOf(gTok) === 0 || g.indexOf(qTok) === 0)) return true;
    return false;
  }
  for (var ri = 0; ri < runs.length; ri++) {
    if (!matches(runs[ri])) continue;
    var sliceLines = lineasTexto.slice(runs[ri].i0, runs[ri].i1);
    var subNorm = sliceLines.join('\n');
    var idxAbLoc = subNorm.toUpperCase().indexOf('ANTIBIOGRAMA');
    if (idxAbLoc === -1) return null;
    var lineasAb = subNorm.substring(idxAbLoc).split('\n').map(function (l) {
      return l.replace(/\r/g, '').replace(/\*+/g, '').trim();
    });
    return parseSensCrudasAntibiogramaSlice(lineasAb);
  }
  return null;
}

export function parseCultivo_(textoBruto, tNorm) {
  var tUpper=tNorm.toUpperCase();
  if(tUpper.indexOf('HEMOCULTIVO')===-1&&tUpper.indexOf('CULTIVO')===-1&&tUpper.indexOf('MICROORGANISMO')===-1&&tUpper.indexOf('MYCOBACTERIAS')===-1&&tUpper.indexOf('BACILOSCOPIA')===-1)return '';
  var fechaC='N/D';
  var mFecha=tNorm.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(mFecha)fechaC=mFecha[1].padStart(2,'0')+'/'+mFecha[2].padStart(2,'0');
  var lineasTexto=textoBruto.split('\n').map(function(l){return l.replace(/\r/g,'');});
  var sitio = buildCultivoTipoDisplay(detectTipoCultivoLine(lineasTexto), detectMuestraDesdeProducto(lineasTexto));
  var germenRuns = findCultivoGermenRuns(lineasTexto);
  var marcasRes = detectMarcasResistenciaCultivo(lineasTexto);
  function abreviarAb(n){
    n=n.toUpperCase().trim();
    if(/PIPERACILINA|PIP\/TAZ/.test(n))return 'PIP/TAZO';
    if(/TRIMET|TMP\/SMX|TRIMET\/SULFA/.test(n))return 'TMP/SMX';
    if(/AMP\S*\/\s*SULB|AMPICILINA.*SULBACTAM|AMP\/SULB/.test(n))return 'AMP-SULB';
    if(/GENT\.?\s*SINERG|SINERG/.test(n))return 'GENT-SIN';
    if(/GENTAMICINA/.test(n))return 'GENT';
    if(/AMIKACINA/.test(n))return 'AMIK';
    if(/TOBRAMICINA/.test(n))return 'TOBRA';
    if(/TETRACICLINA/.test(n))return 'TETRA';
    if(/NITROFURANTOINA/.test(n))return 'NITRO';
    if(/CIPROFLOXACINA/.test(n))return 'CIPRO';
    if(/LEVOFLOXACINA/.test(n))return 'LVX';
    if(/MEROPENEM/.test(n))return 'MERO';
    if(/ERTAPENEM/.test(n))return 'ERTA';
    if(/IMIPENEM/.test(n))return 'IMI';
    if(/CEFTRIAXONA/.test(n))return 'CFTX';
    if(/CEFOTAXIMA/.test(n))return 'CTX';
    if(/CEFOXITINA/.test(n))return 'CFXN';
    if(/CEFAZOLINA/.test(n))return 'CFZ';
    if(/CEFEPIMA/.test(n))return 'FEP';
    if(/CEFTAZIDIM.*AVIBACT|AVIBACTAM/.test(n))return 'CAZ-AVI';
    if(/CEFTAZIDIM|CEFTAZIDIMA/.test(n))return 'CAZ';
    if(/DAPTOMICINA/.test(n))return 'DAPTO';
    if(/LINEZOLID/.test(n))return 'LINEZ';
    if(/VANCOMICINA/.test(n))return 'VANCO';
    if(/PENICILINA|BENZILPENICILINA/.test(n))return 'PEN';
    if(/AMPICILINA/.test(n)&&!/SULB/.test(n))return 'AMP';
    if(/CLINDAMICINA/.test(n))return 'CLINDA';
    var base=n.replace(/\bSODICO\b|\bSODIUM\b|\bDISODICO\b/g,'').trim().split('(')[0].trim().split(/\s+/)[0];
    return base.length>10?base.substring(0,10):base;
  }
  if(germenRuns.length){
    var chunks = [];
    for (var ri = 0; ri < germenRuns.length; ri++) {
      var run = germenRuns[ri];
      var sliceLines = lineasTexto.slice(run.i0, run.i1);
      var subNorm = sliceLines.join('\n');
      var idxAbLoc = subNorm.toUpperCase().indexOf('ANTIBIOGRAMA');
      var head = (ri === 0) ? (sitio + ' ' + fechaC + ': ' + run.germen) : run.germen;
      if (ri === 0 && marcasRes.length) head += ' · ' + marcasRes.join(' · ');
      var chunk = head;
      if (idxAbLoc !== -1) {
        var lineasAb = subNorm.substring(idxAbLoc).split('\n').map(function(l) {
          return l.replace(/\r/g, '').replace(/\*/g, '').trim();
        });
        var sensCrudas = parseSensCrudasAntibiogramaSlice(lineasAb);
        var abCompact = compactarLineasAntibiograma(sensCrudas, abreviarAb);
        if (abCompact) chunk += '\n' + abCompact;
      }
      var cuentaRun = extractCuentaKassFromLineas(sliceLines);
      if (cuentaRun) chunk += '\nCuenta: ' + cuentaRun;
      chunks.push(chunk);
    }
    return chunks.join('\n\n');
  } else {
    if(tNorm.toUpperCase().indexOf('BACILOSCOPIA')!==-1&&tNorm.toUpperCase().indexOf('POSITIVO')!==-1){var mPos=tNorm.match(/BACILOSCOPIA[^\.\n]*POSITIVO[^\n\.]*/i);return 'BACILOSCOPIA '+fechaC+': '+(mPos?mPos[0].trim():'BACILOSCOPIA POSITIVA');}
    var estado='NEGATIVO';var pEst=tUpper.indexOf('ESTADO');if(pEst!==-1){var fEst=tNorm.substring(pEst+17,pEst+80).split('*')[1]||tNorm.substring(pEst+17,pEst+80);estado=fEst.split('MICRO')[0].split('PRODUCTO')[0].trim().toUpperCase();}
    return sitio+' '+fechaC+': '+estado;
  }
}

/** Meses abreviados (reportes en inglés o español) → número 01–12 */
var LAB_FECHA_MESES_ABBREV = { ene:'01', feb:'02', mar:'03', abr:'04', may:'05', jun:'06', jul:'07', ago:'08', sep:'09', oct:'10', nov:'11', dic:'12', jan:'01', apr:'04', aug:'08', dec:'12' };

function padFechaDMY(d, m, yStr) {
  var y = String(yStr);
  if (y.length === 2) y = '20' + y;
  return String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + y;
}

/**
 * Fecha del estudio en dd/mm/aaaa desde el texto crudo del laboratorio.
 * Evita usar la fecha de hoy cuando el reporte trae Fecha registro / resultado / muestra en otro formato.
 */
export function extractLabReportFechaDMY(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') return '';
  var t = textoBruto;
  var m = t.match(/Fecha\s+Registro\s*:?\s*\r?\n?\s*([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (m) {
    var mon = LAB_FECHA_MESES_ABBREV[m[1].toLowerCase().slice(0, 3)];
    if (mon) return padFechaDMY(m[2], mon, m[3]);
  }
  var patronesNum = [
    /Fecha\s+(?:de\s+)?(?:Registro|resultado|Resultado|muestra|Muestra|emisi[oó]n|ingreso|extracci[oó]n)\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(?:Fecha|FECHA)\s+DEL\s+ESTUDIO\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /Recepci[oó]n\s*(?:de\s*)?(?:muestra)?\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(?:Captura|Validaci[oó]n|Reporte)\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i
  ];
  for (var i = 0; i < patronesNum.length; i++) {
    m = t.match(patronesNum[i]);
    if (m) return padFechaDMY(m[1], m[2], m[3]);
  }
  var head = t.slice(0, 3200);
  m = head.match(/\bFecha\s*:\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/i);
  if (m) return padFechaDMY(m[1], m[2], m[3]);
  return '';
}

export function procesarLabs(textoBruto) {
  var tNorm = textoBruto.replace(/\s+/g,' ');
  var mNombre=textoBruto.match(/Nombre:\s*([^\n\r]+)/i);
  var mExp   =textoBruto.match(/Expediente:\s*([^\n\r]+)/i);
  var mSexo  =textoBruto.match(/Sexo:\s*([^\n\r]+)/i);
  var mEdad  =textoBruto.match(/Edad:\s*([^\n\r]+)/i);
  var fechaDm = extractLabReportFechaDMY(textoBruto);
  // Clean expediente: stop before Solicitud/Medico/Fecha/Sexo/Edad keywords
  var expRaw = mExp ? mExp[1].split(/\s+(?:Solicitud|Medico|Médico|Fecha|Sexo|Edad|Ubicaci)/i)[0].trim() : '';
  // Clean edad: only first number
  var edadRaw = mEdad ? (mEdad[1].match(/^\d+/)||[''])[0] : '';
  var edadUnidad = mEdad ? (mEdad[1].match(/\b(años|meses|dias|días|semanas)\b/i)||['años'])[0].toLowerCase() : 'años';
  if (edadUnidad==='dias'||edadUnidad==='días') edadUnidad='días';
  // Clean sexo: extract only first recognized word, normalize to M/F
  var sexoRaw = '';
  if (mSexo) {
    var sm = mSexo[1].match(/^(MASCULINO|FEMENINO|HOMBRE|MUJER|MALE|FEMALE|M\b|F\b)/i);
    if (sm) {
      var sv = sm[1].toUpperCase();
      sexoRaw = (sv==='MASCULINO'||sv==='HOMBRE'||sv==='MALE'||sv==='M') ? 'M' : 'F';
    }
  }
  var mUbic = textoBruto.match(/Ubicaci[oó]n:\s*([^\n\r]+)/i);
  var ubicacion = '';
  if (mUbic) {
    var uRaw = mUbic[1].trim();
    var uTok = uRaw.split(/\t+/).map(function (x) {
      return x.trim();
    }).filter(Boolean);
    ubicacion = (uTok[0] || uRaw.split(/\s+(?:Medico|Médico|Edad)\s*:/i)[0] || uRaw).trim();
  }
  var patient={ name:mNombre?mNombre[1].split(/Fecha|Sexo|Edad/i)[0].trim():'', expediente:expRaw, sexo:sexoRaw, edad:edadRaw?(edadRaw+' '+edadUnidad):'', fecha:fechaDm, ubicacion: ubicacion };

  var mGaso=tNorm.match(/GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)/i);
  var bloqueGaso=mGaso?mGaso[0]:'';
  var mLCR=textoBruto.match(/CITOQUIMICO\s+DE\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i)||textoBruto.match(/CITOQUIMICO\s+LIQ\.?\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i)||textoBruto.match(/CITOQUIMICO\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i);
  var bloqueLCR=mLCR?mLCR[0]:'';
  var bloqueCitoLC=bloqueCitoquimicoLiquidosFull(textoBruto);
  var mEGO=tNorm.match(/(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i);
  var bloqueEGO=mEGO?mEGO[0]:'';
  var tSinLiqCorp=tNorm;
  if (bloqueCitoLC) tSinLiqCorp=tNorm.replace(bloqueCitoLC.replace(/\r/g,'').replace(/\s+/g,' '),' ');
  var textoQS=tSinLiqCorp.replace(bloqueGaso,' ').replace(bloqueEGO,' ').replace(bloqueLCR?bloqueLCR.replace(/\s+/g,' '):'', ' ');
  var esSoloGaso=/GASOMETRIA/i.test(tNorm)&&!/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);

  var resLabs=[];
  var bhExtras = {};
  if(!esSoloGaso){
    var bhRes = parseBH_(tSinLiqCorp);
    if (bhRes && bhRes.visible) resLabs.push(bhRes.visible);
    if (bhRes && bhRes.extras) bhExtras = bhRes.extras;
    var qs = parseQS_(textoQS, {
      edad: edadRaw,
      edadUnidad: edadUnidad,
      sexo: sexoRaw,
    });
    if (qs) resLabs.push(qs);
    var esc=parseESC_(textoQS);if(esc)resLabs.push(esc);
    var pfh=parsePFH_(tSinLiqCorp);  if(pfh)resLabs.push(pfh);
  }
  var gaso=parseGaso_(bloqueGaso, textoQS);if(gaso)resLabs.push(gaso);
  var gasoInterp = buildGasoInterpretacion_(bloqueGaso, textoQS); if (gasoInterp) resLabs.push(gasoInterp);
  var pie=parsePIE_(tNorm);      if(pie)resLabs.push(pie);
  var lcr=parsearLCR(textoBruto);if(lcr)resLabs.push(lcr);
  var liq=parsearCitoquimicoLiquidos(textoBruto);if(liq)resLabs.push(liq);
  var hec=parseFisicoquimicoHeces_(textoBruto);if(hec)resLabs.push(hec);
  var fro=parseFrotisSangre_(textoBruto);if(fro)resLabs.push(fro);
  var ego=parseEGO_(textoBruto); if(ego)resLabs.push(ego);
  var cuant=parseCuantOrina_(textoBruto);if(cuant)resLabs.push(cuant);
  var cult=parseCultivo_(textoBruto,tNorm);if(cult)resLabs.push(cult);

  resLabs = dedupeSingletonSections_(resLabs);
  return { patient: patient, resLabs: resLabs, bhExtras: bhExtras };
}

export function escTxt(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export function renderToken(tok){
  if(!tok)return tok;
  if (tok.endsWith('*')) {
    var inner = escTxt(tok.slice(0,-1));
    return '<strong class="lab-value-altered" title="Fuera de rango de referencia">' + inner + '</strong><span class="lab-value-star" aria-hidden="true">*</span>';
  }
  return escTxt(tok);
}

export function renderEntry(text){
  text = normalizeGasometryInterpretationLine_(text);
  return text.split('\n').map(function(line,li){
    var tabIdx=line.indexOf('\t');
    if(tabIdx>=0){
      var label=line.substring(0,tabIdx);
      var rest=line.substring(tabIdx+1);
      var lh=li===0?'<span class="section-lbl">'+escTxt(label)+'</span>':escTxt(label);
      var rh=rest.split(' ').map(function(tok){
        if(!tok)return tok;
        if(tok==='-')return '<span class="text-gray-500">-</span>';
        return renderToken(tok);
      }).join(' ');
      return lh+'\t'+rh;
    }
    return line.split(' ').map(function(tok,ti){
      if(!tok)return tok;
      if(li===0&&ti===0)return '<span class="section-lbl">'+escTxt(tok)+'</span>';
      if(tok==='-')return '<span class="text-gray-500">-</span>';
      return renderToken(tok);
    }).join(' ');
  });
}
