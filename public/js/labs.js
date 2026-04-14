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

export function parseCultivo_(textoBruto,tNorm){
  var tUpper=tNorm.toUpperCase();
  if(tUpper.indexOf('HEMOCULTIVO')===-1&&tUpper.indexOf('CULTIVO')===-1&&tUpper.indexOf('MICROORGANISMO')===-1&&tUpper.indexOf('MYCOBACTERIAS')===-1&&tUpper.indexOf('BACILOSCOPIA')===-1)return '';
  var germen='',cuenta='',sitio='CULTIVO',fechaC='N/D';
  var mFecha=tNorm.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(mFecha)fechaC=mFecha[1].padStart(2,'0')+'/'+mFecha[2].padStart(2,'0');
  var lineasTexto=textoBruto.split('\n').map(function(l){return l.replace(/\r/g,'');});
  for(var i=0;i<lineasTexto.length;i++){if(lineasTexto[i].toUpperCase().indexOf('PRODUCTO')!==-1){for(var j=i+1;j<lineasTexto.length;j++){var s=lineasTexto[j].replace(/\*/g,'').trim();if(s){sitio=s.toUpperCase();break;}}break;}}
  var idxMicro=-1;for(var i=0;i<lineasTexto.length;i++){if(lineasTexto[i].toUpperCase().indexOf('MICROORGANISMO')!==-1){idxMicro=i;break;}}
  if(idxMicro!==-1){for(var k=idxMicro+1;k<Math.min(idxMicro+6,lineasTexto.length);k++){var cand=lineasTexto[k].replace(/\*/g,'').trim();if(!cand)continue;if(/COMENTARIO/i.test(cand))break;if(/MICROORGANISMO/i.test(cand))continue;if(!/MALDI|IDENTIF|ESPECTRO/i.test(cand)){germen=cand.toUpperCase();break;}}}
  var pCuenta=tUpper.indexOf('CUENTA');if(pCuenta!==-1){var fragC=tNorm.substring(pCuenta+6,pCuenta+80);if(!/ANTIBIOGRAMA/i.test(fragC)){var mC=fragC.match(/([<>]=?\s?\d+(\.\d+)?\s*[A-Z%\/]*)/i);if(mC)cuenta=mC[1].trim().toUpperCase();}}
  function abreviarAb(n){n=n.toUpperCase().trim();if(/PIPERACILINA.?TAZOBACTAM|PIP\/TAZ/.test(n))return 'PIP/TAZO';if(/TRIMETROPRIM.?SULFAMETOXAZOL|TMP\/SMX|TRIMET\/SULFA/.test(n))return 'TMP/SMX';if(/CLINDAMICINA/.test(n))return 'CLINDA';var base=n.replace(/\bSODICO\b|\bSODIUM\b|\bDISODICO\b/g,'').trim().split('(')[0].trim().split(/\s+/)[0];return base.length>10?base.substring(0,10):base;}
  if(germen){
    var res=sitio+' '+fechaC+': '+germen;
    var idxAb=textoBruto.toUpperCase().indexOf('ANTIBIOGRAMA');
    if(idxAb!==-1){var lineasAb=textoBruto.substring(idxAb).split('\n').map(function(l){return l.replace(/\r/g,'').replace(/\*/g,'').trim();});var sensCrudas=[];
      for(var i=0;i<lineasAb.length-1;i++){var nL=lineasAb[i],vL=lineasAb[i+1];if(!nL||nL.length<=3||/ANTIBIOGRAMA|MICROORGANISMO|COMENTARIO:|CUENTA|PRODUCTO|ESTADO|MUESTRA|GRAM|IDENTIFICACION|ESTUDIO\s+RESULTADO/i.test(nL))continue;var mic='',interp='';var mV=vL.match(/([<>]=?\s?\d+(\.\d+)?)[\s\t]+(S|R|I|NEG|POS)$/i);if(mV){mic=mV[1].replace(/\s/g,'');interp=mV[3].toUpperCase();}else{var lim=vL.toUpperCase();if(/^(S|R|I)$/.test(lim))interp=lim;else if(/NO SUSCEPTIBLE/.test(lim))interp='NO SUSCEPTIBLE';}if(interp)sensCrudas.push({med:nL.toUpperCase(),mic:mic,interp:interp});}
      var sensFmt=sensCrudas.map(function(s){return abreviarAb(s.med)+': '+(s.mic?s.mic+' ':'')+s.interp;});
      var filas=[];for(var i=0;i<sensFmt.length;i+=3){filas.push((sensFmt[i]?'• '+sensFmt[i]:'')+(sensFmt[i+1]?'  • '+sensFmt[i+1]:'')+(sensFmt[i+2]?'  • '+sensFmt[i+2]:''));}
      if(filas.length)res+='\n'+filas.join('\n');}
    if(cuenta)res+='\nCuenta: '+cuenta;return res;
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
  var mEGO=tNorm.match(/(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i);
  var bloqueEGO=mEGO?mEGO[0]:'';
  var textoQS=tNorm.replace(bloqueGaso,' ').replace(bloqueEGO,' ').replace(bloqueLCR?bloqueLCR.replace(/\s+/g,' '):'', ' ');
  var esSoloGaso=/GASOMETRIA/i.test(tNorm)&&!/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);

  var resLabs=[];
  if(!esSoloGaso){
    var bh=parseBH_(tNorm);    if(bh)resLabs.push(bh);
    var qs=parseQS_(textoQS);  if(qs)resLabs.push(qs);
    var esc=parseESC_(textoQS);if(esc)resLabs.push(esc);
    var pfh=parsePFH_(tNorm);  if(pfh)resLabs.push(pfh);
  }
  var gaso=parseGaso_(bloqueGaso);if(gaso)resLabs.push(gaso);
  var pie=parsePIE_(tNorm);      if(pie)resLabs.push(pie);
  var lcr=parsearLCR(textoBruto);if(lcr)resLabs.push(lcr);
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
