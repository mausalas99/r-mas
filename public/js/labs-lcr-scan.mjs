// LCR citoquímico line scanner (complexity split from labs.js).

function scanNumericAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var m = lineas[j].match(/(\d+(\.\d+)?)/);
    if (m) return m[1];
  }
  return '';
}

function scanTextAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var txt = lineas[j].replace(/\*/g, '').trim();
    if (txt && !/ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA/i.test(txt)) return txt.toUpperCase();
  }
  return '';
}

function scanLeucocitos_(lineas, i) {
  for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
    var m = lineas[j].match(/(\d+)\s*$/);
    if (m) return m[1];
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
  return { pH: '', aspecto: '', leu: '', glu: '', prot: '', cl: '', gram: '', tinta: '' };
}

export function scanLcrLine_(fields, lineas, i, linUp, lin) {
  if (linUp.indexOf('PH') === 0) fields.pH = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf('ASPECTO') === 0) fields.aspecto = scanTextAfter_(lineas, i, 4);
  if (linUp.indexOf('RECUENTO CELULAR') === 0 || linUp.indexOf('LEUCOCITOS') === 0) {
    fields.leu = scanLeucocitos_(lineas, i);
  }
  if (linUp.indexOf('GLUCOSA') === 0) fields.glu = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf('PROTEINAS') === 0) fields.prot = scanProteinas_(lineas, i, lin);
  if (linUp.indexOf('CLORURO') === 0) fields.cl = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf('GRAM') === 0) fields.gram = scanTextAfter_(lineas, i, 4);
  if (linUp.indexOf('TINTA CHINA') === 0) fields.tinta = scanTextAfter_(lineas, i, 4);
}

export function lcrFieldsEmpty_(fields) {
  return !(fields.aspecto || fields.leu || fields.glu || fields.prot || fields.cl || fields.gram || fields.tinta);
}

export function buildLcrLine_(fields) {
  var p = ['LCR:'];
  if (fields.pH) p.push('pH', fields.pH);
  if (fields.aspecto) p.push('Asp', fields.aspecto);
  if (fields.leu) p.push('Leu', fields.leu);
  if (fields.glu) p.push('Glu', fields.glu);
  if (fields.prot) p.push('Prot', fields.prot);
  if (fields.cl) p.push('Cl', fields.cl);
  if (fields.gram) p.push('Gram', fields.gram);
  if (fields.tinta) p.push('Tinta', fields.tinta);
  return p[0] + '\t' + p.slice(1).join(' ');
}
