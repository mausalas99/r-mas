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
  var hbData  = extraerConRango(['HGB','HEMOGLOBINA TOTAL','HEMOGLOBINA'], tNorm);
  if (hbData.valor === '---') return '';
  var htoData = extraerConRango(['HCT ','HEMATOCRITO'], tNorm);
  var vcmData = extraerConRango(['MCV ','VCM '], tNorm);
  var hcmData = extraerConRango(['MCH ','HCM '], tNorm);
  var leuData = extraerConRango(['WBC '], tNorm);
  var neuData = extraerConRango(['NEU '], tNorm);
  var eosData = extraerConRango(['EOS '], tNorm);
  var pltData = extraerConRango(['PLT '], tNorm);
  var retData = extraerConRango(['RETICULOCITOS'], tNorm);
  var tpData  = extraerConRango(['TIEMPO DE PROTROMBINA'], tNorm);
  var ttpData = extraerConRango(['TIEMPO DE TROMBOPLASTINA'], tNorm);
  var inrData = extraerConRango(['INR '], tNorm);

  var Hb  = fmt(marcarSegunRango(hbData.valor,  hbData.min,  hbData.max));
  var Hto = fmt(marcarSegunRango(htoData.valor, htoData.min, htoData.max));
  var VCM = fmt(marcarSegunRango(vcmData.valor, vcmData.min, vcmData.max));
  var HCM = fmt(marcarSegunRango(hcmData.valor, hcmData.min, hcmData.max));
  var Leu = fmt(marcarSegunRango(leuData.valor, leuData.min, leuData.max));
  var Neu = fmt(marcarSegunRango(neuData.valor, neuData.min, neuData.max));
  var Eos = fmt(marcarSegunRango(eosData.valor, eosData.min, eosData.max));
  var Plt = fmt(marcarSegunRango(pltData.valor, pltData.min, pltData.max));
  var Ret = fmt(marcarSegunRango(retData.valor, retData.min, retData.max));
  var TP  = fmt(marcarSegunRango(tpData.valor,  tpData.min,  tpData.max));
  var TTP = fmt(marcarSegunRango(ttpData.valor, ttpData.min, ttpData.max));
  var INR = fmt(marcarSegunRango(inrData.valor, inrData.min, inrData.max));

  var p = ['BH'];
  p.push('Hb', Hb);
  if (Hto !== '---') p.push('Hto', Hto);
  if (VCM !== '---') p.push('VCM', VCM);
  if (HCM !== '---') p.push('HCM', HCM);
  if (Leu !== '---') p.push('Leu', Leu);
  if (Neu !== '---') p.push('Neu', Neu);
  if (Eos !== '---') p.push('Eos', Eos);
  if (Plt !== '---') p.push('Plt', Plt);
  if (Ret !== '---') p.push('Ret', Ret);
  var coag = [];
  if (TP  !== '---') coag.push('TP',  TP);
  if (TTP !== '---') coag.push('TTP', TTP);
  if (INR !== '---') coag.push('INR', INR);
  if (coag.length) { p.push('-'); p = p.concat(coag); }
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parseQS_(texto) {
  var gluData = extraerConRango(['GLUCOSA EN SANGRE','GLUCOSA EN','GLUCOSA'], texto);
  var crData  = extraerConRango(['CREATININA EN SANGRE','CREATININA'], texto);
  var bunData = extraerConRango(['NITROGENO DE LA UREA EN SANGRE','NITROGENO DE LA UREA','UREA'], texto);
  var pcrData = extraerConRango(['PROTEINA C REACTIVA','PROTEÍNA C REACTIVA'], texto);
  var auData  = extraerConRango(['ACIDO URICO EN SANGRE','ACIDO URICO','ÁCIDO ÚRICO'], texto);
  var tglData = extraerConRango(['TRIGLICERIDOS','TRIGLICÉRIDOS'], texto);
  var colData = extraerConRango(['COLESTEROL'], texto);
  var vsgData = extraerConRango(['VSG ','VELOCIDAD DE SEDIMENTACION'], texto);
  var cpkData = extraerConRango(['CPK CREATIN FOSFO QUINASA','CPK '], texto);

  var Glu = fmt(marcarSegunRango(gluData.valor, gluData.min, gluData.max));
  var Cr  = fmt(marcarSegunRango(crData.valor,  crData.min,  crData.max));
  var BUN = fmt(marcarSegunRango(bunData.valor, bunData.min, bunData.max));
  var PCR = fmt(marcarSegunRango(pcrData.valor, pcrData.min, pcrData.max));
  var AU  = fmt(marcarSegunRango(auData.valor,  auData.min,  auData.max));
  var TGL = fmt(marcarSegunRango(tglData.valor, tglData.min, tglData.max));
  var COL = fmt(marcarSegunRango(colData.valor, colData.min, colData.max));
  var VSG = fmt(marcarSegunRango(vsgData.valor, vsgData.min, vsgData.max));
  var CPK = fmt(marcarSegunRango(cpkData.valor, cpkData.min, cpkData.max));

  if ([Glu,Cr,BUN,PCR,AU,TGL,COL,VSG,CPK].every(function(v){return v==='---';})) return '';

  var p = ['QS'];
  if (Glu !== '---') p.push('Glu', Glu);
  if (Cr  !== '---') p.push('Cr',  Cr);
  if (BUN !== '---') p.push('BUN', BUN);
  if (PCR !== '---') p.push('PCR', PCR);
  if (AU  !== '---') p.push('AU',  AU);
  if (TGL !== '---') p.push('TGL', TGL);
  if (COL !== '---') p.push('COL', COL);
  if (VSG !== '---') p.push('VSG', VSG);
  if (CPK !== '---') p.push('CPK', CPK);
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parseESC_(texto) {
  var naData = extraerConRango(['SODIO'], texto);
  if (naData.valor === '---') return '';
  var clData = extraerConRango(['CLORO'], texto);
  var kData  = extraerConRango(['POTASIO'], texto);
  var caData = extraerConRango(['CALCIO EN SUERO','CALCIO'], texto);
  var fData  = extraerConRango(['FOSFORO EN SANGRE','FOSFORO','FÓSFORO'], texto);
  var mgData = extraerConRango(['MAGNESIO'], texto);

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
  var albData  = extraerConRango(['ALBUMINA'], tNorm);
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

export function parseGaso_(bloqueGaso) {
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

  var pH   = fmt(marcarSegunRango(phData.valor,   phData.min,   phData.max));
  var pCO2 = fmt(marcarSegunRango(pco2Data.valor, pco2Data.min, pco2Data.max));
  var pO2  = fmt(marcarSegunRango(po2Data.valor,  po2Data.min,  po2Data.max));
  var Na   = fmt(marcarSegunRango(naData.valor,   naData.min,   naData.max));
  var K    = fmt(marcarSegunRango(kData.valor,    kData.min,    kData.max));
  var GLU  = fmt(marcarSegunRango(gluData.valor,  gluData.min,  gluData.max));
  var Lac  = fmt(marcarSegunRango(lacData.valor,  lacData.min,  lacData.max));
  var Bica = fmt(marcarSegunRango(hco3Data.valor, hco3Data.min, hco3Data.max));

  var p = ['GASES'];
  p.push('pH', pH);
  if (pCO2 !== '---') p.push('pCO2', pCO2);
  if (pO2  !== '---') p.push('pO2',  pO2);
  if (Na   !== '---') p.push('Na',   Na);
  if (K    !== '---') p.push('K',    K);
  if (GLU  !== '---') p.push('GLU',  GLU);
  if (Lac  !== '---') p.push('Lactato', Lac);
  if (Bica !== '---') p.push('Bica', Bica);
  return p[0]+'\t'+p.slice(1).join(' ');
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

/**
 * Citoquímico de líquidos corporales (ascitis, pleural, peritoneal, etc.).
 * No confundir con LCR (parsearLCR).
 */
export function parsearCitoquimicoLiquidos(textoBruto) {
  var bloque = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloque) return '';
  var lineas = bloque.split(/\r?\n/).map(function(l) { return l.trim(); });
  var fluid = '', dens = '', pH = '', glu = '', prot = '', ldh = '', aspecto = '', leu = '',
    rec = '', pmn = '', eri = '', gram = '', com = '';
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
      for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
        var m = lineas[j].match(/(\d+(\.\d+)?)/);
        if (m) { ldh = m[1]; break; }
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
        if (/^\d+[.,]?\d*$/.test(c)) { leu = c.replace(',', '.'); break; }
      }
      if (!leu) {
        for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
          var c = lineas[j].replace(/\*/g, '').trim();
          if (/^\d+[.,]?\d*$/.test(c)) { leu = c.replace(',', '.'); break; }
        }
      }
    }
    if (linUp.indexOf('POLIMORFONUCLEARES') === 0) {
      var ptxt = nextMeaningful(i, 5);
      if (ptxt) pmn = ptxt.toUpperCase();
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
  if (!fluid && !dens && !pH && !glu && !prot && !ldh && !aspecto && !leu && !rec && !pmn && !eri && !gram && !com) return '';
  var p = ['Liq:'];
  if (fluid) p.push('Tipo', fluid);
  if (dens) p.push('Dens', dens);
  if (pH) p.push('pH', pH);
  if (glu) p.push('Glu', glu);
  if (prot) p.push('Prot', prot);
  if (ldh) p.push('LDH', ldh);
  if (aspecto) p.push('Asp', aspecto);
  if (rec) p.push('Rec', rec);
  if (leu) p.push('Leu', leu);
  if (pmn) p.push('PMN', pmn);
  if (eri) p.push('Eri', eri);
  if (gram) p.push('Gram', gram);
  if (com) p.push('Obs', com);
  return p[0] + '\t' + p.slice(1).join(' ');
}

export function parseEGO_(textoBruto) {
  var tUp=textoBruto.toUpperCase();
  var pos=tUp.indexOf('EXAMEN GENERAL DE ORINA')!==-1?tUp.indexOf('EXAMEN GENERAL DE ORINA'):
          tUp.indexOf('ANALISIS DE ORINA')!==-1?tUp.indexOf('ANALISIS DE ORINA'):
          tUp.indexOf('URIANALISIS')!==-1?tUp.indexOf('URIANALISIS'):-1;
  if(pos===-1)return '';
  var fin=tUp.search(/BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA/);
  var bloque=(fin!==-1&&fin>pos)?textoBruto.substring(pos,fin):textoBruto.substring(pos);
  var lineas=bloque.split(/\r?\n/).map(function(l){return l.replace(/\*/g,'').trim();});
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
  if(color==='---'&&aspecto==='---'&&ph==='---'&&leu==='---'&&eri==='---')return '';
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
  for (var i = idxBact + 1; i < Math.min(idxBact + 35, lineasTexto.length); i++) {
    var l = lineasTexto[i].replace(/\r/g, '').replace(/\*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!l) continue;
    var lUp = l.toUpperCase();
    if (/^BACTERIOLOGIA$/.test(lUp)) continue;
    if (/^ESTUDIO(\s+RESULTADO)?$/.test(lUp)) continue;
    if (/^RESULTADO$/.test(lUp) || /^UNIDADES$/.test(lUp) || /^VALOR DE REFERENCIA$/.test(lUp)) continue;
    if (/^PRODUCTO$/.test(lUp)) break;
    if (/\bUROCULTIVO\b/i.test(l) || /\bHEMOCULTIVO\b/i.test(l) || /^CATETER(\b|$)/i.test(lUp))
      return l;
  }
  return '';
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
 * Resumen ATB sin CMI: solo R | I | ESBL (no lista S).
 * Deduplica por fármaco; gana la peor categoría al fusionar antibiogramas.
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
  var R = [], I = [], E = [];
  Object.keys(byKey).sort().forEach(function(k) {
    var it = byKey[k].interp;
    if (it === 'S' || it === 'POS') return;
    if (it === 'I') I.push(k);
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
  if (!parts.length) return 'ATB sin R/I/ESBL';
  var line = 'ATB ' + parts.join(' | ');
  if (line.length <= 220) return line;
  return 'ATB ' + parts.join('\n');
}

/**
 * Todos los aislamientos con nombre tras MICROORGANISMO (uro/hemo polimicrobiano).
 * Corta antes del siguiente MICROORGANISMO o de la sección MALDI.
 */
function findCultivoGermenRuns(lineasTexto) {
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

function parseSensCrudasAntibiogramaSlice(lineasAb) {
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

export function parseCultivo_(textoBruto,tNorm){
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

export function procesarLabs(textoBruto) {
  var tNorm = textoBruto.replace(/\s+/g,' ');
  var mNombre=textoBruto.match(/Nombre:\s*([^\n\r]+)/i);
  var mExp   =textoBruto.match(/Expediente:\s*([^\n\r]+)/i);
  var mSexo  =textoBruto.match(/Sexo:\s*([^\n\r]+)/i);
  var mEdad  =textoBruto.match(/Edad:\s*([^\n\r]+)/i);
  var mFechaR=textoBruto.match(/Fecha\s+Registro:\s*\r?\n?\s*([A-Za-z]{3}\s+\d{1,2}\s+\d{4})/i);
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
  var patient={ name:mNombre?mNombre[1].split(/Fecha|Sexo|Edad/i)[0].trim():'', expediente:expRaw, sexo:sexoRaw, edad:edadRaw?(edadRaw+' '+edadUnidad):'', fecha:mFechaR?mFechaR[1].trim():'' };

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
  if(!esSoloGaso){
    var bh=parseBH_(tSinLiqCorp);    if(bh)resLabs.push(bh);
    var qs=parseQS_(textoQS);  if(qs)resLabs.push(qs);
    var esc=parseESC_(textoQS);if(esc)resLabs.push(esc);
    var pfh=parsePFH_(tSinLiqCorp);  if(pfh)resLabs.push(pfh);
  }
  var gaso=parseGaso_(bloqueGaso);if(gaso)resLabs.push(gaso);
  var pie=parsePIE_(tNorm);      if(pie)resLabs.push(pie);
  var lcr=parsearLCR(textoBruto);if(lcr)resLabs.push(lcr);
  var liq=parsearCitoquimicoLiquidos(textoBruto);if(liq)resLabs.push(liq);
  var ego=parseEGO_(textoBruto); if(ego)resLabs.push(ego);
  var cuant=parseCuantOrina_(textoBruto);if(cuant)resLabs.push(cuant);
  var cult=parseCultivo_(textoBruto,tNorm);if(cult)resLabs.push(cult);

  return { patient:patient, resLabs:resLabs };
}

export function escTxt(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export function renderToken(tok){
  if(!tok)return tok;
  return tok.endsWith('*') ? '<strong>'+escTxt(tok.slice(0,-1))+'</strong>' : escTxt(tok);
}

export function renderEntry(text){
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
