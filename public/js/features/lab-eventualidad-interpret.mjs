/**
 * Build verbal lab interpretation text for Eventualidades.
 * Prosa corrida en español (biometría / química / gasometría), solo hallazgos.
 */
import { parseBhTrendValuesFromResLab } from '../labs-bh.mjs';
import {
  isCitoquimInterpretacionResLabChunk,
  citoquimInterpretacionBody_,
} from '../labs-citoquimico-interpret.mjs';
import { evaluateGasoExtended } from '../gaso-extended.mjs';
import { normalizeFechaLabHistory } from '../tend-core.mjs';

/**
 * @typedef {{ n: number|null, raw: string, flagged: boolean }} LabPair
 */

/** @param {Date} [d] @returns {string} DD/MM/YYYY */
export function formatLocalTodayFecha(d) {
  var date = d instanceof Date ? d : new Date();
  var dd = String(date.getDate()).padStart(2, '0');
  var mm = String(date.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + date.getFullYear();
}

/**
 * Parse "Label 12.3*" style pairs from a compact resLabs line/block.
 * @param {unknown} entry
 * @returns {Record<string, LabPair>}
 */
export function parseCompactLabPairs(entry) {
  var out = Object.create(null);
  if (entry == null) return out;
  var text = String(entry);
  var lines = text.split(/\r?\n/);
  lines.forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    var body = trimmed;
    var tab = trimmed.indexOf('\t');
    if (tab >= 0) body = trimmed.slice(tab + 1).trim();
    ingestTokenPairs_(body, out);
  });
  return out;
}

/**
 * @param {Record<string, LabPair|{val?:string,ab?:boolean}|string|number>} pairs
 * @returns {string[]}
 */
export function interpretBhPhrases(pairs) {
  var p = normalizePairs_(pairs);
  var phrases = [];
  var hb = numOf_(p.Hb);
  var vcm = numOf_(p.VCM);
  var hto = numOf_(p.Hto);
  var anemia =
    (hb != null && hb < 12) ||
    flagged_(p.Hb) ||
    (hto != null && hto < 36) ||
    flagged_(p.Hto);
  if (anemia && hb != null) {
    var morph = 'normocítica';
    if (vcm != null && vcm < 80) morph = 'microcítica';
    else if (vcm != null && vcm > 100) morph = 'macrocítica';
    var bits = ['Hb ' + fmtNum_(hb)];
    if (vcm != null) bits.push('VCM ' + fmtNum_(vcm));
    if (hto != null) bits.push('Hto ' + fmtNum_(hto));
    phrases.push('anemia ' + morph + ' con ' + joinProse_(bits));
  } else if (hb != null && hb > 17) {
    phrases.push('poliglobulia con Hb ' + fmtNum_(hb));
  }

  var leu = numOf_(p.Leu);
  if (leu != null && (leu > 11 || (flagged_(p.Leu) && leu >= 11))) {
    phrases.push('leucocitosis con Leu ' + fmtNum_(leu));
  } else if (leu != null && (leu < 4 || (flagged_(p.Leu) && leu < 11))) {
    phrases.push('leucopenia con Leu ' + fmtNum_(leu));
  }

  var plt = numOf_(p.Plt);
  if (plt != null && (plt < 150 || (flagged_(p.Plt) && plt <= 150))) {
    phrases.push('trombocitopenia con Plt ' + fmtNum_(plt));
  } else if (plt != null && (plt > 450 || (flagged_(p.Plt) && plt >= 450))) {
    phrases.push('trombocitosis con Plt ' + fmtNum_(plt));
  }

  var neu = numOf_(p.Neu);
  if (neu != null && (neu > 75 || flagged_(p.Neu))) {
    phrases.push('neutrofilia con Neu ' + fmtNum_(neu) + '%');
  }
  var eos = numOf_(p.Eos);
  if (eos != null && (eos > 5 || flagged_(p.Eos))) {
    phrases.push('eosinofilia con Eos ' + fmtNum_(eos) + '%');
  }
  return phrases;
}

/**
 * @param {Record<string, LabPair>} pairs
 * @returns {string[]}
 */
export function interpretChemPhrases(pairs) {
  var p = normalizePairs_(pairs);
  var phrases = [];
  pushNamedRange_(phrases, p.Na, 'Na', 135, 145, 'hiponatremia', 'hipernatremia');
  pushNamedRange_(phrases, p.K, 'K', 3.5, 5.0, 'hipopotasemia', 'hiperpotasemia');
  pushNamedRange_(phrases, p.Cl, 'Cl', 98, 107, 'hipocloremia', 'hipercloremia');
  pushNamedRange_(phrases, p.Ca, 'Ca', 8.5, 10.5, 'hipocalcemia', 'hipercalcemia');
  pushNamedRange_(phrases, p.Mg, 'Mg', 1.7, 2.4, 'hipomagnesemia', 'hipermagnesemia');
  pushNamedRange_(phrases, p.P, 'P', 2.5, 4.5, 'hipofosfatemia', 'hiperfosfatemia');

  var glu = numOf_(p.Glu);
  if (glu != null) {
    if (glu > 180 || (flagged_(p.Glu) && glu >= 100)) {
      phrases.push('hiperglucemia con Glu ' + fmtNum_(glu));
    } else if (glu < 70 || (flagged_(p.Glu) && glu < 100)) {
      phrases.push('hipoglucemia con Glu ' + fmtNum_(glu));
    }
  }

  pushElevDim_(phrases, p.Cr, 'creatinina', 'elevada', 'disminuida', 0.6, 1.3, 'Cr');
  pushElevDim_(phrases, p.BUN, 'BUN', 'elevado', 'disminuido', 7, 20, null);
  pushElevDim_(phrases, p.PCR, 'PCR', 'elevada', 'disminuida', 0, 0.5, null);
  pushElevDim_(phrases, p.PCT, 'PCT', 'elevada', 'disminuida', 0, 0.5, null);

  pushElevDim_(phrases, p.AST, 'AST', 'elevada', 'disminuida', 0, 40, null);
  pushElevDim_(phrases, p.ALT, 'ALT', 'elevada', 'disminuida', 0, 40, null);
  pushElevDim_(phrases, p.BT, 'BT', 'elevada', 'disminuida', 0, 1.2, null);
  pushElevDim_(phrases, p.BD, 'BD', 'elevada', 'disminuida', 0, 0.3, null);
  pushElevDim_(phrases, p.FA, 'FA', 'elevada', 'disminuida', 40, 129, null);
  pushElevDim_(phrases, p.GGT, 'GGT', 'elevada', 'disminuida', 0, 40, null);
  pushElevDim_(phrases, p.LDH, 'LDH', 'elevada', 'disminuida', 0, 250, null);
  pushElevDim_(phrases, p.Alb, 'albúmina', 'elevada', 'disminuida', 3.5, 5.2, null);
  pushElevDim_(phrases, p.AU, 'AU', 'elevado', 'disminuido', 2.5, 7.0, null);
  pushElevDim_(phrases, p.CPK, 'CPK', 'elevada', 'disminuida', 0, 200, null);
  return phrases;
}

/**
 * @param {Record<string, LabPair>} pairs
 * @returns {string[]}
 */
export function interpretCoagPhrases(pairs) {
  var p = normalizePairs_(pairs);
  var phrases = [];
  pushElevDim_(phrases, p.TP, 'TP', 'elevado', 'disminuido', 10, 14, null);
  pushElevDim_(phrases, p.INR, 'INR', 'elevado', 'disminuido', 0.8, 1.2, null);
  pushElevDim_(phrases, p.TTPa, 'TTPa', 'elevado', 'disminuido', 25, 35, null);
  var fib = p.Fibrinógeno || p.Fib;
  pushElevDim_(phrases, fib, 'fibrinógeno', 'elevado', 'disminuido', 200, 400, null);
  return phrases;
}

/**
 * @param {unknown[]} resLabs
 * @returns {string[]}
 */
export function extractExistingInterpretBodies(resLabs) {
  var out = [];
  (resLabs || []).forEach(function (row) {
    var s = String(row || '').trim();
    if (!s) return;
    if (isCitoquimInterpretacionResLabChunk(s)) {
      var body = citoquimInterpretacionBody_(s);
      if (body) out.push(body.replace(/\.$/, ''));
      return;
    }
    var mGaso = s.match(/^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:\t?(.*)$/i);
    if (mGaso && String(mGaso[1] || '').trim()) {
      out.push(String(mGaso[1]).trim().replace(/\.$/, ''));
    }
  });
  return out;
}

/**
 * Spanish prose bits for gasometría (no English tokens / Winter formula dump).
 * @param {object} set labHistory set
 * @returns {string[]}
 */
export function interpretGasoPhrases(set) {
  var resLabs = (set && set.resLabs) || [];
  var gasPairs = Object.create(null);
  var chemPairs = Object.create(null);
  resLabs.forEach(function (row) {
    var s = String(row || '');
    if (/^GASES\b/i.test(s.trim())) Object.assign(gasPairs, parseCompactLabPairs(s));
    if (/^(QS|ESC|PFHs)\b/i.test(s.trim())) Object.assign(chemPairs, parseCompactLabPairs(s));
  });
  var pH = numOf_(gasPairs.pH);
  var pCO2 = numOf_(gasPairs.pCO2);
  var pO2 = numOf_(gasPairs.pO2);
  var hco3 = numOf_(gasPairs.Bica) != null ? numOf_(gasPairs.Bica) : numOf_(gasPairs.HCO3);
  var input = {
    pH: pH,
    pCO2: pCO2,
    pO2: pO2,
    hco3: hco3,
    na: numOf_(chemPairs.Na) != null ? numOf_(chemPairs.Na) : numOf_(gasPairs.Na),
    cl: numOf_(chemPairs.Cl),
    alb: numOf_(chemPairs.Alb),
    uag: numOf_(gasPairs.UAG),
  };
  var hasCore = input.pH != null || input.pCO2 != null || input.hco3 != null;
  if (!hasCore) return [];

  var ev = evaluateGasoExtended(input);
  var bits = [];
  if (pH != null) {
    if (pH < 7.35) bits.push('acidemia con pH ' + fmtNum_(pH));
    else if (pH > 7.45) bits.push('alcalemia con pH ' + fmtNum_(pH));
    else bits.push('pH en rango con ' + fmtNum_(pH));
  }

  var primary = ev && ev.steps && ev.steps.primary ? ev.steps.primary : null;
  var primaryEs = primaryDisorderEs_(primary);
  if (primaryEs) bits.push(primaryEs);

  var metaLow = hco3 != null && hco3 < 22;
  var winterCenter = hco3 != null ? 1.5 * hco3 + 8 : null;
  if (
    metaLow &&
    pCO2 != null &&
    winterCenter != null &&
    isFinite(winterCenter) &&
    (pCO2 > winterCenter + 2 || pCO2 < winterCenter - 2)
  ) {
    bits.push(
      'la PaCO₂ medida no corresponde a la compensación respiratoria esperada de una acidosis metabólica única'
    );
  }

  if (pCO2 != null) bits.push('PaCO₂ ' + fmtNum_(pCO2) + ' mmHg');
  if (hco3 != null) bits.push('HCO₃⁻ ' + fmtNum_(hco3));
  if (pO2 != null) bits.push('PaO₂ ' + fmtNum_(pO2) + ' mmHg');

  var ag = ev && ev.steps && ev.steps.anionGap ? ev.steps.anionGap : null;
  if (ag && ag.value != null) {
    var agBit = 'anión gap ' + String(ag.value);
    if (ag.corrected != null) agBit += ', corregido ' + String(ag.corrected);
    bits.push(agBit);
  }

  return bits.slice(0, 6);
}

/**
 * @param {object} set
 * @returns {string[]}
 */
function compactFallbackLines_(set) {
  var bits = [];
  (set.resLabs || []).forEach(function (row) {
    var s = String(row || '').trim();
    if (!s) return;
    if (/interpretaci[oó]n/i.test(s)) return;
    var one = s.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (!one) return;
    if (one.length > 160) one = one.slice(0, 157) + '…';
    bits.push(one);
  });
  return bits.slice(0, 8);
}

/**
 * @param {object[]} labSets
 * @param {{
 *   todayFecha?: string,
 *   normalizeFecha?: (raw: unknown) => string,
 *   filterToday?: boolean,
 *   includeFallbackCompact?: boolean,
 * }} [opts]
 * @returns {string}
 */
export function buildLabEventualidadInterpretText(labSets, opts) {
  var o = opts || {};
  var today = String(o.todayFecha || formatLocalTodayFecha()).trim();
  var norm =
    typeof o.normalizeFecha === 'function' ? o.normalizeFecha : normalizeFechaLabHistory;
  var filterToday = o.filterToday !== false;
  var useFallback = !!o.includeFallbackCompact;
  var todays = (labSets || []).filter(function (set) {
    if (!set) return false;
    if (!filterToday) return true;
    var f = norm(set.fecha) || String(set.fecha || '').trim();
    return f === today;
  });
  if (!todays.length) return '';

  var sections = [];
  todays.forEach(function (set) {
    var fecha = norm(set.fecha) || String(set.fecha || '').trim() || today;
    var hora = String(set.hora || '').trim();
    var stamp = fecha + (hora ? ' ' + hora : '');
    var paragraphs = [];

    var bhPairs = Object.create(null);
    var chemPairs = Object.create(null);
    var coagPairs = Object.create(null);
    var tropBits = [];

    (set.resLabs || []).forEach(function (row) {
      var s = String(row || '').trim();
      if (!s) return;
      if (/^BH\b/i.test(s) || /^BH:/i.test(s)) {
        Object.assign(bhPairs, bhPairsFromEntry_(row));
        return;
      }
      if (/^(QS|ESC|PFHs)\b/i.test(s)) {
        Object.assign(chemPairs, parseCompactLabPairs(s));
        return;
      }
      if (/^COAG\b/i.test(s)) {
        Object.assign(coagPairs, parseCompactLabPairs(s));
        return;
      }
      if (/^TROP\b/i.test(s)) {
        var tp = parseCompactLabPairs(s);
        Object.keys(tp).forEach(function (k) {
          if (numOf_(tp[k]) != null) {
            tropBits.push(k + ' ' + fmtNum_(numOf_(tp[k])));
          }
        });
      }
    });

    var bh = interpretBhPhrases(bhPairs);
    if (bh.length) paragraphs.push('En la biometría se aprecia ' + joinProse_(bh) + '.');

    var chem = interpretChemPhrases(chemPairs);
    if (chem.length) paragraphs.push('En la química clínica se aprecia ' + joinProse_(chem) + '.');

    var coag = interpretCoagPhrases(coagPairs);
    if (coag.length) paragraphs.push('En la coagulación se aprecia ' + joinProse_(coag) + '.');

    if (tropBits.length) {
      paragraphs.push('En troponinas se aprecia ' + joinProse_(tropBits) + '.');
    }

    var gaso = interpretGasoPhrases(set);
    if (gaso.length) paragraphs.push('En la gasometría se aprecia ' + joinProse_(gaso) + '.');

    var existing = extractExistingInterpretBodies(set.resLabs || []);
    existing.forEach(function (body) {
      var t = String(body || '').trim();
      if (!t) return;
      paragraphs.push(t.endsWith('.') ? t : t + '.');
    });

    if (!paragraphs.length && useFallback) {
      var compact = compactFallbackLines_(set);
      if (compact.length) {
        paragraphs.push('En laboratorio se registran ' + joinProse_(compact) + '.');
      }
    }

    if (!paragraphs.length) return;
    sections.push('Labs ' + stamp + ':\n' + paragraphs.join(' '));
  });

  return sections.join('\n\n').trim().toUpperCase();
}

function primaryDisorderEs_(primary) {
  if (!primary) return '';
  var d = String(primary.disorder || '');
  var t = String(primary.type || '');
  var typeEs =
    t === 'acidosis' ? 'acidosis' : t === 'alkalosis' ? 'alcalosis' : '';
  if (d === 'mixed') {
    return typeEs
      ? 'trastorno mixto con ' + typeEs
      : 'trastorno ácido-base mixto';
  }
  if (d === 'metabolic') {
    if (typeEs === 'acidosis') return 'acidosis metabólica';
    if (typeEs === 'alcalosis') return 'alcalosis metabólica';
    return 'trastorno metabólico';
  }
  if (d === 'respiratory') {
    if (typeEs === 'acidosis') return 'acidosis respiratoria';
    if (typeEs === 'alcalosis') return 'alcalosis respiratoria';
    return 'trastorno respiratorio';
  }
  if (d === 'compensated') {
    return typeEs && typeEs !== 'none'
      ? 'trastorno compensado con ' + typeEs
      : 'trastorno ácido-base compensado';
  }
  if (d === 'unknown') return '';
  return '';
}

function bhPairsFromEntry_(entry) {
  var typed = parseBhTrendValuesFromResLab(entry);
  if (typed && Object.keys(typed).length) {
    var out = Object.create(null);
    Object.keys(typed).forEach(function (k) {
      var v = typed[k];
      if (v && typeof v === 'object' && v.val != null) {
        out[k] = {
          n: parseFloat(String(v.val).replace(',', '.')),
          raw: String(v.val),
          flagged: !!v.ab,
        };
        if (!isFinite(out[k].n)) out[k].n = null;
      }
    });
    if (Object.keys(out).length) return out;
  }
  return parseCompactLabPairs(entry);
}

function ingestTokenPairs_(text, into) {
  if (!text) return;
  var tokens = String(text).trim().split(/\s+/);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    var next = tokens[i + 1];
    if (!label || next == null) {
      i++;
      continue;
    }
    var m = String(next).match(/^(-?\d+(?:[.,]\d+)?)(?:%)?(\*)?$/);
    if (m) {
      var key = String(label).replace(/:$/, '');
      var n = parseFloat(m[1].replace(',', '.'));
      into[key] = {
        n: isFinite(n) ? n : null,
        raw: m[1],
        flagged: !!m[2] || String(next).indexOf('*') >= 0,
      };
      i += 2;
    } else {
      i++;
    }
  }
}

function normalizePairs_(pairs) {
  var out = Object.create(null);
  Object.keys(pairs || {}).forEach(function (k) {
    var v = pairs[k];
    if (v && typeof v === 'object' && ('n' in v || 'val' in v || 'raw' in v)) {
      if ('n' in v) {
        out[k] = v;
      } else {
        var n = parseFloat(String(v.val != null ? v.val : v.raw || '').replace(',', '.'));
        out[k] = {
          n: isFinite(n) ? n : null,
          raw: String(v.val != null ? v.val : v.raw || ''),
          flagged: !!v.ab || !!v.flagged,
        };
      }
      return;
    }
    var n2 = parseFloat(String(v).replace(',', '.'));
    out[k] = { n: isFinite(n2) ? n2 : null, raw: String(v), flagged: false };
  });
  return out;
}

function numOf_(pair) {
  if (!pair) return null;
  if (typeof pair.n === 'number' && isFinite(pair.n)) return pair.n;
  return null;
}

function flagged_(pair) {
  return !!(pair && pair.flagged);
}

function fmtNum_(n) {
  if (n == null || !isFinite(n)) return '';
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return String(Math.round(n * 100) / 100);
}

/** @param {string[]} items */
function joinProse_(items) {
  var list = (items || []).filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return list[0] + ' y ' + list[1];
  return list.slice(0, -1).join(', ') + ' y ' + list[list.length - 1];
}

function pushNamedRange_(phrases, pair, label, lo, hi, lowName, highName) {
  var n = numOf_(pair);
  if (n == null) return;
  if (n < lo) {
    phrases.push(lowName + ' con ' + label + ' ' + fmtNum_(n));
  } else if (n > hi) {
    phrases.push(highName + ' con ' + label + ' ' + fmtNum_(n));
  } else if (flagged_(pair)) {
    if (n - lo <= hi - n) {
      phrases.push(lowName + ' con ' + label + ' ' + fmtNum_(n));
    } else {
      phrases.push(highName + ' con ' + label + ' ' + fmtNum_(n));
    }
  }
}

function pushElevDim_(phrases, pair, name, elevAdj, dimAdj, lo, hi, valueLabel) {
  var n = numOf_(pair);
  if (n == null) return;
  var withVal = valueLabel
    ? ' con ' + valueLabel + ' ' + fmtNum_(n)
    : ' con ' + fmtNum_(n);
  if (n > hi) {
    phrases.push(name + ' ' + elevAdj + withVal);
  } else if (n < lo) {
    phrases.push(name + ' ' + dimAdj + withVal);
  } else if (flagged_(pair)) {
    if (n - lo <= hi - n) {
      phrases.push(name + ' ' + dimAdj + withVal);
    } else {
      phrases.push(name + ' ' + elevAdj + withVal);
    }
  }
}
