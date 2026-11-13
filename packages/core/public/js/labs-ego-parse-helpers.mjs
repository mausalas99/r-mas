/** EGO parse helpers — extracted from labs-ego-parse.mjs for complexity budget. */

var EGO_SKIP_SEARCH =
  /^(N\/A|EstudioResultado|ESTUDIO|SEDIMENTO|QUIMICO|FISICO|MICROSCOPICO|URIANALISIS|EXAMEN GENERAL|OBSERVACIONES)/i;
var EGO_SKIP_LABEL =
  /^(N\/A|Estudio|Resultado|Unidades|Valor de Referencia|VALOR DE REF)/i;

var EGO_ABBREV = {
  NEGATIVO: 'NEG',
  NEGATIVE: 'NEG',
  POSITIVO: 'POS',
  POSITIVE: 'POS',
  AUSENTES: 'AUS',
  AUSENTE: 'AUS',
  ESCASAS: 'ESC',
  ESCASO: 'ESC',
  MODERADAS: 'MOD',
  MODERADO: 'MOD',
  ABUNDANTES: 'ABD',
  ABUNDANTE: 'ABD',
  AMARILLO: 'AMAR',
  TURBIO: 'TURB',
  CLARO: 'CLARO',
};

var EGO_POS_NEG_TYPES = ['PROT', 'GLU', 'CET', 'BILI', 'NITR', 'ESTLEU'];
var EGO_AUS_TYPES = ['BACT', 'CELEP', 'CLING', 'CLINH', 'LEVAD', 'MOCO'];

export function valorTrasEtiqueta(lineas, etiquetas) {
  for (var e = 0; e < etiquetas.length; e++) {
    var lbl = etiquetas[e].toUpperCase();
    for (var i = 0; i < lineas.length; i++) {
      if (lineas[i].toUpperCase() !== lbl) continue;
      for (var j = i + 1; j < Math.min(i + 10, lineas.length); j++) {
        var l = lineas[j].trim();
        if (!l || /^[ABHL]$/.test(l) || EGO_SKIP_LABEL.test(l) || /^[-–:/.]+$/.test(l)) continue;
        var mNum = l.match(/^(-?\d+[.,]?\d*)/);
        if (mNum) return mNum[1].replace(',', '.');
      }
    }
  }
  return null;
}

function esUnidadEGO_(l) {
  return (
    /^(Hem\/uL|Leucocitos\/uL|E\.U\.\/dL|mOsm\/L|mg\/dL|mmol\/L|g\/dL|\/CAMPO|K\/uL|fL|pg|uL|U\/L|SEG\.?)$/i.test(l) ||
    /^[a-zA-Z]+\/[a-zA-Z]+$/.test(l)
  );
}

function tryParseEgoValue(l) {
  var mApr = l.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/i);
  if (mApr) return mApr[1];
  if (esUnidadEGO_(l)) return null;
  if (/^\d[\d.,]*\s+[-–]\s+\d[\d.,]*$/.test(l)) return null;
  if (/^\d+[-–]\d+\//.test(l)) return null;
  if (/^\d+[-–]\d+$/.test(l)) return l;
  var mNum = l.match(/^(-?\d+[.,]?\d*)/);
  if (mNum) return mNum[1].replace(',', '.');
  if (l.length <= 30 && !/\d{4,}/.test(l) && !/VALOR DE REF/i.test(l)) return l.toUpperCase();
  return null;
}

export function buscarValorEGO_(lineas, nombres) {
  for (var n = 0; n < nombres.length; n++) {
    for (var i = 0; i < lineas.length; i++) {
      if (lineas[i].toUpperCase() !== nombres[n].toUpperCase()) continue;
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var l = lineas[j].trim();
        if (!l || /^[ABHL]$/.test(l) || /^[:\-/.\s]+$/.test(l) || EGO_SKIP_SEARCH.test(l)) continue;
        var parsed = tryParseEgoValue(l);
        if (parsed != null) return parsed;
      }
    }
  }
  return '---';
}

export function abreviarEGO_(val) {
  if (!val || val === '---') return '---';
  var v = val.toUpperCase().trim();
  return EGO_ABBREV[v] || v;
}

function marcarEGOPosNeg_(ab, tipo) {
  if (EGO_POS_NEG_TYPES.indexOf(tipo) !== -1) return ab !== 'NEG' && ab !== 'AUS' ? ab + '*' : ab;
  if (EGO_AUS_TYPES.indexOf(tipo) !== -1) return ab !== 'AUS' ? ab + '*' : ab;
  return ab;
}

function marcarEGOThreshold_(ab, val, threshold) {
  var mR = val.match(/^(\d+)[-–](\d+)$/);
  if (mR) return parseInt(mR[1], 10) > threshold ? ab + '*' : ab;
  var vC = parseFloat(val);
  return !isNaN(vC) && vC > threshold ? ab + '*' : ab;
}

function marcarEGORange_(ab, val, low, high) {
  var v = parseFloat(val);
  return !isNaN(v) && (v < low || v > high) ? ab + '*' : ab;
}

export function marcarEGO_(val, tipo) {
  if (!val || val === '---') return '---';
  var ab = abreviarEGO_(val);
  if (tipo === 'SANG') {
    var vSang = parseFloat(val);
    if (!isNaN(vSang)) return vSang > 0 ? val + '*' : 'NEG';
    return ab !== 'NEG' && ab !== 'AUS' ? ab + '*' : ab;
  }
  if (tipo === 'UROBIL') {
    var vU = parseFloat(val);
    return !isNaN(vU) && vU > 1 ? ab + '*' : ab;
  }
  if (tipo === 'PH') return marcarEGORange_(ab, val, 5.5, 6.5);
  if (tipo === 'DENS') return marcarEGORange_(ab, val, 1.005, 1.025);
  if (tipo === 'LEU') return marcarEGOThreshold_(ab, val, 5);
  if (tipo === 'ERI') return marcarEGOThreshold_(ab, val, 2);
  return marcarEGOPosNeg_(ab, tipo);
}

var EGO_FIELD_DEFS = [
  { section: 'fisico', key: 'color', prefix: '', tipo: 'COLOR' },
  { section: 'fisico', key: 'aspecto', prefix: '', tipo: 'ASPECTO' },
  { section: 'fisico', key: 'ph', prefix: 'pH ', tipo: 'PH' },
  { section: 'fisico', key: 'dens', prefix: 'D ', tipo: 'DENS' },
  { section: 'quimico', key: 'prot', prefix: 'Prot ', tipo: 'PROT' },
  { section: 'quimico', key: 'glu', prefix: 'Glu ', tipo: 'GLU' },
  { section: 'quimico', key: 'cet', prefix: 'Cet ', tipo: 'CET' },
  { section: 'quimico', key: 'bilis', prefix: 'Bili ', tipo: 'BILI' },
  { section: 'quimico', key: 'sangre', prefix: 'Sang ', tipo: 'SANG' },
  { section: 'quimico', key: 'nitr', prefix: 'Nitr ', tipo: 'NITR' },
  { section: 'quimico', key: 'urobil', prefix: 'Urobil ', tipo: 'UROBIL' },
  { section: 'quimico', key: 'estLeu', prefix: 'EstLeu ', tipo: 'ESTLEU' },
  { section: 'sedimento', key: 'leu', prefix: 'Leu ', tipo: 'LEU' },
  { section: 'sedimento', key: 'eri', prefix: 'Eri ', tipo: 'ERI' },
  { section: 'sedimento', key: 'bact', prefix: 'Bact ', tipo: 'BACT', skipAus: true },
  { section: 'sedimento', key: 'celEpit', prefix: 'CelEp ', tipo: 'CELEP', skipAus: true },
  { section: 'sedimento', key: 'cilinG', prefix: 'CilinG ', tipo: 'CLING', skipAus: true },
  { section: 'sedimento', key: 'cilinH', prefix: 'CilinH ', tipo: 'CLINH', skipAus: true },
  { section: 'sedimento', key: 'levad', prefix: 'Levad ', tipo: 'LEVAD', skipAus: true },
  { section: 'sedimento', key: 'moco', prefix: 'Moco ', tipo: 'MOCO', skipAus: true },
];

var EGO_FIELD_LABELS = {
  color: ['COLOR'],
  aspecto: ['ASPECTO'],
  ph: ['PH'],
  dens: ['DENSIDAD', 'GRAVEDAD ESPECIFICA'],
  prot: ['PROTEINAS', 'PROTEINURIA'],
  glu: ['GLUCOSA'],
  cet: ['CETONAS', 'CUERPOS CETONICOS'],
  bilis: ['BILIRRUBINAS', 'BILIRRUBINA'],
  sangre: ['SANGRE'],
  nitr: ['NITRITOS'],
  urobil: ['UROBILINOGENO', 'UROBILINÓGENO'],
  estLeu: ['ESTERASA LEUCOCITARIA'],
  leu: ['LEUCOCITOS'],
  eri: ['ERITROCITOS', 'HEMATIES'],
  bact: ['BACTERIAS'],
  celEpit: ['CELULAS EPITELIALES'],
  cilinG: ['CILINDROS GRANOLOSOS'],
  cilinH: ['CILINDROS HIALINOS'],
  levad: ['LEVADURAS'],
  moco: ['MOCO'],
};

export function collectEgoFieldValues_(lineas) {
  var out = {};
  Object.keys(EGO_FIELD_LABELS).forEach(function (key) {
    out[key] = buscarValorEGO_(lineas, EGO_FIELD_LABELS[key]);
  });
  return out;
}

export function buildEgoSections_(f) {
  var sections = { fisico: [], quimico: [], sedimento: [] };
  EGO_FIELD_DEFS.forEach(function (def) {
    var val = f[def.key];
    if (val === '---') return;
    if (def.skipAus && abreviarEGO_(val) === 'AUS') return;
    sections[def.section].push(def.prefix + marcarEGO_(val, def.tipo));
  });
  return sections;
}

/** Prefix parseEGO_ writes before each labeled EGO value ("pH 5.0*", "Prot NEG"). */
const EGO_STORED_PREFIX = { pH: 'pH', Dens: 'D', Prot: 'Prot', Glu: 'Glu', Cet: 'Cet', Bili: 'Bili', Nitr: 'Nitr', EstLeu: 'EstLeu', Leu: 'Leu', Eri: 'Eri' };

/**
 * EGO values of one stored "EGO:" chunk, keyed by catalog field (pH, Prot, Leu, Color, Asp...).
 * Values keep parseEGO_'s "*" abnormal marker. Color/Asp: first words of the physical line.
 * @param {string} chunk @returns {Record<string, string>}
 */
export function egoFieldsFromChunk(chunk) {
  var out = {};
  var body = String(chunk || '').replace(/^\s*EGO:/, '');
  if (body === String(chunk || '')) return out; // not an EGO chunk
  var first = body.split('\n').map(function (l) { return l.trim(); }).find(Boolean) || '';
  var parts = first.split(/\s{2,}/);
  var isToken = function (p) { return Object.keys(EGO_STORED_PREFIX).some(function (k) { return p.indexOf(EGO_STORED_PREFIX[k] + ' ') === 0; }); };
  if (parts[0] && !isToken(parts[0])) out.Color = parts[0];
  if (parts[1] && !isToken(parts[1])) out.Asp = parts[1];
  Object.keys(EGO_STORED_PREFIX).forEach(function (f) {
    var m = body.match(new RegExp('(?:^|\\s)' + EGO_STORED_PREFIX[f] + '\\s+(\\S+)'));
    if (m) out[f] = m[1];
  });
  return out;
}
