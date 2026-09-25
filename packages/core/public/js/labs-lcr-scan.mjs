// LCR citoquímico line scanner (complexity split from labs.js).

function isLcrFieldLabel_(txt) {
  return /^(RECUENTO(?:\s+CELULAR)?|LEUCOCITOS(?:\s+POLIMORFONUCLEARES|\s*\/\s*MM3?)?|POLIMORFONUCLEARES|LINFOCITOS|%PMN|%LINFOCITOS|GLUCOSA|PROTEINAS|CLORURO|GRAM|TINTA(?:\s+CHINA)?|ERITROCITOS|COAGLUTIN(?:ACION)?|PH\b|ASPECTO|OTROS|LCR|ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|COMENTARIOS?)$/i.test(
    txt
  );
}

function scanNumericAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var raw = lineas[j].replace(/\*/g, '').trim();
    if (!raw) continue;
    if (isLcrFieldLabel_(raw)) break;
    var m = raw.match(/^(\d+(?:[.,]\d+)?)/);
    if (m) return m[1].replace(',', '.');
  }
  return '';
}

function scanTextAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var txt = lineas[j].replace(/\*/g, '').trim();
    if (!txt) continue;
    if (/ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA/i.test(txt)) continue;
    if (isLcrFieldLabel_(txt)) break;
    if (/^\d+(?:[.,]\d+)?$/.test(txt)) break;
    if (/^---+$/.test(txt)) return '';
    return txt.toUpperCase();
  }
  return '';
}

function scanLeucocitos_(lineas, i) {
  for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
    var raw = lineas[j].replace(/\*/g, '').trim();
    if (!raw) continue;
    if (isLcrFieldLabel_(raw)) break;
    if (/^---+$/.test(raw)) return '0';
    var m = raw.match(/^(\d+(?:[.,]\d+)?)\s*$/);
    if (m) return m[1].replace(',', '.');
  }
  return '';
}

function scanProteinas_(lineas, i, lin) {
  var mL = lin.match(/PROTEINAS\s*([A-Z])\s*$/i);
  var letra = mL ? mL[1].toUpperCase() : '';
  var val = scanNumericAfter_(lineas, i, 4);
  return val ? val + letra : '';
}

/** @returns {object} */
export function emptyLcrFields_() {
  return {
    pH: '',
    aspecto: '',
    leu: '',
    glu: '',
    prot: '',
    cl: '',
    gram: '',
    tinta: '',
    pmn: '',
    linf: '',
  };
}

function scanLcrPH_(fields, lineas, i, linUp) {
  if (linUp.indexOf('PH') !== 0) return;
  fields.pH = scanNumericAfter_(lineas, i, 4);
}

function scanLcrAspecto_(fields, lineas, i, linUp) {
  if (linUp.indexOf('ASPECTO') !== 0) return;
  fields.aspecto = scanTextAfter_(lineas, i, 4);
}

function scanLcrLeucocitosTotal_(fields, lineas, i, linUp) {
  var esLeucocitosTotal =
    linUp.indexOf('LEUCOCITOS') === 0 && linUp.indexOf('POLIMORFONUCLEARES') === -1;
  if (linUp.indexOf('RECUENTO CELULAR') !== 0 && !esLeucocitosTotal) return;
  var leuVal = scanLeucocitos_(lineas, i);
  if (leuVal !== '') fields.leu = leuVal;
}

function scanLcrGlucosa_(fields, lineas, i, linUp) {
  if (linUp.indexOf('GLUCOSA') !== 0) return;
  fields.glu = scanNumericAfter_(lineas, i, 4);
}

function scanLcrProteinas_(fields, lineas, i, linUp, lin) {
  if (linUp.indexOf('PROTEINAS') !== 0) return;
  fields.prot = scanProteinas_(lineas, i, lin);
}

function scanLcrCloruro_(fields, lineas, i, linUp) {
  if (linUp.indexOf('CLORURO') !== 0) return;
  fields.cl = scanNumericAfter_(lineas, i, 4);
}

function scanLcrGram_(fields, lineas, i, linUp) {
  if (linUp.indexOf('GRAM') !== 0) return;
  fields.gram = scanTextAfter_(lineas, i, 4);
}

function scanLcrTinta_(fields, lineas, i, linUp) {
  if (linUp.indexOf('TINTA CHINA') !== 0) return;
  fields.tinta = scanTextAfter_(lineas, i, 4);
}

function scanLcrPmn_(fields, lineas, i, linUp) {
  if (linUp.indexOf('POLIMORFONUCLEARES') !== 0 && linUp.indexOf('LEUCOCITOS POLIMORFONUCLEARES') !== 0) {
    return;
  }
  var pmnVal = scanNumericAfter_(lineas, i, 4);
  if (pmnVal !== '') fields.pmn = pmnVal;
}

function scanLcrLinfocitos_(fields, lineas, i, linUp) {
  if (linUp.indexOf('LINFOCITOS') !== 0) return;
  var linfVal = scanNumericAfter_(lineas, i, 4);
  if (linfVal !== '') fields.linf = linfVal;
}

var LCR_LINE_SCANNERS_ = [
  scanLcrPH_,
  scanLcrAspecto_,
  scanLcrLeucocitosTotal_,
  scanLcrGlucosa_,
  scanLcrProteinas_,
  scanLcrCloruro_,
  scanLcrGram_,
  scanLcrTinta_,
  scanLcrPmn_,
  scanLcrLinfocitos_,
];

export function scanLcrLine_(fields, lineas, i, linUp, lin) {
  for (var s = 0; s < LCR_LINE_SCANNERS_.length; s++) {
    LCR_LINE_SCANNERS_[s](fields, lineas, i, linUp, lin);
  }
}

export function isInvalidLcrTextField_(val) {
  if (val === '' || val == null) return true;
  var s = String(val).toUpperCase().trim();
  if (/^---+$/.test(s)) return true;
  return isLcrFieldLabel_(s);
}

export function lcrFieldsEmpty_(fields) {
  return !(
    fields.aspecto ||
    fields.leu !== '' ||
    fields.glu ||
    fields.prot ||
    fields.cl ||
    fields.gram ||
    fields.tinta ||
    fields.pH ||
    fields.pmn ||
    fields.linf
  );
}

export function buildLcrLine_(fields) {
  var p = ['LCR:'];
  if (fields.pH) p.push('pH', fields.pH);
  if (fields.aspecto) p.push('Asp', fields.aspecto);
  if (fields.leu !== '') p.push('Leu', fields.leu);
  if (fields.pmn) p.push('PMN', fields.pmn + '%');
  if (fields.linf) p.push('Linf', fields.linf + '%');
  if (fields.glu) p.push('Glu', fields.glu);
  if (fields.prot) p.push('Prot', fields.prot);
  if (fields.cl) p.push('Cl', fields.cl);
  if (fields.gram) p.push('Gram', fields.gram);
  if (fields.tinta) p.push('Tinta', fields.tinta);
  return p[0] + '\t' + p.slice(1).join(' ');
}
