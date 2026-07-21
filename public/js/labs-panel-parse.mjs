/**
 * Parser genérico de paneles extendidos (numéricos + cualitativos).
 */
import { extraerConRangoPanel, marcarSegunRango, fmt } from './labs-extract.mjs';
import { LAB_EXTENDED_PANEL_DEFS, LAB_EXTENDED_SECTION_KEYS } from './labs-panel-defs.mjs';

export { LAB_EXTENDED_SECTION_KEYS, labExtendedSectionAlt_ } from './labs-panel-defs.mjs';

function panelGatesMatch_(def, texto) {
  var gates = def.gates || [];
  if (!gates.length) return true;
  for (var i = 0; i < gates.length; i++) {
    if (gates[i].test(texto)) return true;
  }
  return false;
}

function fmtNumField_(labels, texto) {
  var data = extraerConRangoPanel(labels, texto);
  return fmt(marcarSegunRango(data.valor, data.min, data.max));
}

export function parseNumericPanel_(def, texto) {
  if (!texto || !panelGatesMatch_(def, texto)) return '';
  var parts = [];
  for (var i = 0; i < def.fields.length; i++) {
    var f = def.fields[i];
    var val = fmtNumField_(f.labels, texto);
    if (val !== '---') parts.push(f.key, val);
  }
  if (!parts.length) return '';
  return def.sectionKey + '\t' + parts.join(' ');
}

function formatQualSco_(raw) {
  var n = parseFloat(String(raw || '').replace(',', '.'));
  if (!isFinite(n)) return String(raw || '').trim();
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function qualShort_(qual) {
  var q = String(qual || '').toUpperCase();
  if (q === 'NEGATIVO') return 'neg';
  if (q === 'POSITIVO') return 'pos*';
  if (q === 'INDETERMINADO') return 'indet*';
  return '';
}

function lineMatchesPatterns_(line, patterns) {
  for (var p = 0; p < patterns.length; p++) {
    if (patterns[p].test(line)) return true;
  }
  return false;
}

function readQualFromFollowLines_(lineas, i) {
  var sco = null;
  var qual = '';
  for (var j = i + 1; j < Math.min(i + 12, lineas.length); j++) {
    var t = String(lineas[j] || '').replace(/\*/g, '').trim();
    if (!t || t === ':') continue;
    if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(t)) continue;
    if (/^S\/CO$/i.test(t)) continue;
    if (/^(Positivo|Indeterminado|Negativo)\s*[<>=]/i.test(t)) continue;
    // Título duplicado SOME (mismo estudio) vs estudio siguiente.
    if (/^(Anticuerpos|Ant[ií]geno|Antigeno)\b/i.test(t) && j > i + 1) {
      if (sco == null && !qual) continue;
      break;
    }
    var mNum = t.match(/^(\d+\.\d+|\d+)$/);
    if (mNum && sco === null) {
      sco = mNum[1];
      continue;
    }
    var mQ = t.match(/^(NEGATIVO|POSITIVO|INDETERMINADO)$/i);
    if (mQ) {
      qual = mQ[1].toUpperCase();
      break;
    }
  }
  return qual ? { sco: sco, qual: qual } : null;
}

function extractQualField_(lineas, patterns) {
  for (var i = 0; i < lineas.length; i++) {
    var line = String(lineas[i] || '').replace(/\t.*$/, '').trim();
    if (!line || !lineMatchesPatterns_(line, patterns)) continue;
    return readQualFromFollowLines_(lineas, i);
  }
  return null;
}

export function parseQualPanel_(def, texto) {
  if (!texto || !panelGatesMatch_(def, texto)) return '';
  var lineas = texto.split(/\r?\n/).map(function (l) {
    return String(l || '').trim();
  });
  var parts = [];
  for (var e = 0; e < def.fields.length; e++) {
    var f = def.fields[e];
    var res = extractQualField_(lineas, f.patterns);
    if (!res || !res.qual) continue;
    var q = qualShort_(res.qual);
    if (!q) continue;
    var token = f.key + ' ' + q;
    if (res.sco != null) token += ' (' + formatQualSco_(res.sco) + ')';
    parts.push(token);
  }
  if (!parts.length) return '';
  return def.sectionKey + '\t' + parts.join(' ');
}

export function parsePanelDef_(def, texto) {
  if (!def) return '';
  if (def.mode === 'qual') return parseQualPanel_(def, texto);
  return parseNumericPanel_(def, texto);
}

function mergeSectionLines_(lines) {
  var bodies = Object.create(null);
  var order = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var tab = line.indexOf('\t');
    if (tab < 0) continue;
    var key = line.slice(0, tab);
    var body = line.slice(tab + 1).trim();
    if (!body) continue;
    if (!bodies[key]) {
      bodies[key] = [];
      order.push(key);
    }
    bodies[key].push(body);
  }
  return order.map(function (k) {
    return k + '\t' + bodies[k].join(' ');
  });
}

/**
 * Parsea todos los paneles extendidos definidos; fusiona secciones repetidas (p. ej. GI num+qual).
 * @returns {string[]}
 */
export function parseExtendedLabPanels_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') return [];
  var out = [];
  for (var i = 0; i < LAB_EXTENDED_PANEL_DEFS.length; i++) {
    var line = parsePanelDef_(LAB_EXTENDED_PANEL_DEFS[i], textoBruto);
    if (line) out.push(line);
  }
  return mergeSectionLines_(out);
}
