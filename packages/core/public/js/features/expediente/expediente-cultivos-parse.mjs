// Cultivo block parsing, copy, lab output fragments
import { getLabHistory } from '../../app-state.mjs';
import { parseFechaLabToMs, normalizeFechaLabHistory } from '../../tend-core.mjs';
import {
  renderEntryNodes,
  extractSensCrudasForGermFromSource,
  formatCultivoCondensedForCopy,
  isParsedCultivoHeaderLine,
  parseCuentaFromCultivoChunkLines,
} from '../../labs.js';
import { hn } from '../../labs-display.mjs';
import { insertSpaceAfterCultivoKeyword_ } from '../../labs-cultivo-scan.mjs';
import { buildAtbTableNodes } from '../../labs-cultivo-atb.mjs';
import {
  findCultivoChunkInSet,
  classifyCultureTipoKeyFromHeaderLine,
  CULTIVO_TIPO_LABELS,
} from '../../cultivo-block-core.mjs';
import { rt, aid } from './expediente-runtime.mjs';

function isCultureTableHeaderLine(t) {
  return isParsedCultivoHeaderLine(t);
}

function completePartialFechaForCultivo(dm, set) {
  if (!dm) return '';
  var parts = String(dm).trim().split('/');
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    var joined = parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = new Date().getFullYear();
  if (set && set.fecha && set.fecha !== 'Anterior') {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, '');
    if (typeof ms === 'number' && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y;
}

function cultureBlockLooksNegative(left, right) {
  var L = (left + ' ' + right).toUpperCase();
  if (!String(right || '').trim()) return true;
  return (
    /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(L)
  );
}

/**
 * Una fila de tabla = primera línea cabecera (sitio/fecha:germen) + resto (ATB, cuenta…).
 */
function parseCultureHeaderFields(rawHeader, set) {
  var line = String(rawHeader || '').replace(/\s+/g, ' ').trim();
  var colon = line.indexOf(':');
  var left = colon >= 0 ? line.slice(0, colon).trim() : line;
  var right = colon >= 0 ? line.slice(colon + 1).trim() : '';
  var fechaMuestra = '';
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (dm) {
    fechaMuestra = completePartialFechaForCultivo(dm[1], set);
    sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, '').trim();
  }
  return { line, left, right, fechaMuestra, sitio };
}

function resolveCultureOrganismo(left, right) {
  var organismo = right.replace(/\s+/g, ' ').trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = 'Negativo';
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = 'Negativo';
  else if (!organismo) organismo = '—';
  return { organismo, negativo };
}

function buildCultureRowObject(set, seq, tipoKey, studyDate, sortMs, header, org, cuenta, resStr) {
  var sortKeyMs = sortMs;
  if (header.fechaMuestra) {
    var fmNorm = normalizeFechaLabHistory(header.fechaMuestra) || header.fechaMuestra;
    var fmParsed = parseFechaLabToMs(fmNorm, '');
    if (typeof fmParsed === 'number' && isFinite(fmParsed)) sortKeyMs = fmParsed;
  }
  return {
    row: {
      studyDate: studyDate,
      fechaMuestra: header.fechaMuestra || '—',
      sitio: header.sitio || '—',
      organismo: org.organismo,
      cuenta: cuenta || '',
      resistencias: resStr || (org.negativo ? '—' : ''),
      negativo: org.negativo,
      sortMs: sortMs,
      sortKeyMs: sortKeyMs,
      tipoKey: tipoKey,
      tipoLabel: CULTIVO_TIPO_LABELS[tipoKey] || CULTIVO_TIPO_LABELS.otro,
      labSetId: set && set.id != null ? set.id : '',
      _seq: typeof seq === 'number' ? seq : 0,
    },
  };
}

function parseCultureBlockFromLineArray(lines, set, seq) {
  var rawHeader = insertSpaceAfterCultivoKeyword_(String(lines[0] || ''));
  var tipoKey = classifyCultureTipoKeyFromHeaderLine(rawHeader);
  var studyDate = rt.buildLabSetDateLine(set) || '—';
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs !== 'number' || !isFinite(sortMs)) sortMs = 0;
  var header = parseCultureHeaderFields(rawHeader, set);
  var org = resolveCultureOrganismo(header.left, header.right);
  var bodyLines = lines.slice(1);
  var cuenta = parseCuentaFromCultivoChunkLines(bodyLines);
  var resStr = bodyLines
    .filter(function (ln) {
      var t = String(ln || '').trim();
      if (!t || /^Cuenta:/i.test(t)) return false;
      if (/^USER\b/i.test(t)) return false;
      if (/\bLabo\s*-?\d+/i.test(t) && /\b(Campo|Feme)\b|\bLabo\s*-?\d+\*?\s+[A-Z]{2,6}\s+\d+/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .trim();
  return buildCultureRowObject(set, seq, tipoKey, studyDate, sortMs, header, org, cuenta, resStr);
}

function copyCultivoCondensado(setId, organismo) {
  var pid = aid();
  if (!pid) {
    rt.showToast('Selecciona un paciente', 'error');
    return;
  }
  var sets = getLabHistory()[pid] || [];
  var set = sets.find(function (s) {
    return String(s.id) === String(setId);
  });
  if (!set) {
    rt.showToast('No se encontró el envío en historial', 'error');
    return;
  }
  var chunk = findCultivoChunkInSet(set, organismo);
  if (!chunk) {
    rt.showToast('No hay resumen de cultivo procesado para copiar', 'error');
    return;
  }
  var t = formatCultivoCondensedForCopy(chunk, rt.buildLabSetDateLine(set) || '');
  if (!t.trim()) {
    rt.showToast('No hay texto para copiar', 'error');
    return;
  }
  var p =
    navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(t)
      : Promise.reject(new Error('no clipboard'));
  p.then(
    function () {
      rt.showToast('Cultivo condensado copiado', 'success');
    },
    function () {
      rt.showToast('No se pudo copiar al portapapeles', 'error');
    }
  );
}

function germHintFromCultivoHeadLine(headLine) {
  var line = String(headLine || '').replace(/\s+/g, ' ').trim();
  var colon = line.lastIndexOf(':');
  if (colon >= 0) {
    var right = line.slice(colon + 1).trim();
    if (right) return right;
  }
  return line;
}

function germQueryFromCultivoChunkHead(headLine) {
  var h = germHintFromCultivoHeadLine(headLine);
  var base = h.split(/\s*·\s*/)[0].trim();
  return base || h;
}

function isResLabChunkPureCultivo(text) {
  var sp = rt.splitResLabsByTipo([text]);
  if (sp.labs.length) return false;
  return sp.cultivo.some(function (r) {
    return String(r || '').trim();
  });
}

function negativeLabel_(germ) {
  var d = String(germ).match(/DESPUES DE (\d+) DIAS/i);
  return d ? 'Negativo a ' + d[1] + ' días' : sentenceCase_(germ);
}

function sentenceCase_(s) {
  var l = String(s || '').trim().toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
}

/**
 * Cabecera de un cultivo para el día: "UROCULTIVO POR MICCION 13/11: ESCHERICHIA COLI · BLEE" →
 * germen grande, tipo y fecha en gris, cuenta a la derecha. Un cultivo negativo es una sola fila.
 * Devuelve null si la línea no tiene la forma esperada (se dibuja como texto plano).
 */
function buildCultivoHeadNode_(headLine, cuenta) {
  var m = String(headLine || '').match(/^(.*?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?):\s*(.+)$/);
  if (!m) return null;
  var tipo = m[1];
  var fecha = m[2];
  var tags = m[3].split(/\s*·\s*/);
  var germ = tags.shift();
  if (/NEGATIV/i.test(germ)) {
    var paren = (tipo.match(/\(([^)]*)\)/) || [])[1];
    var name = tipo.replace(/\s*\([^)]*\)/, '');
    return hn('div', { class: 'cult-neg' }, [
      hn('span', { class: 'cult-neg-name' }, [sentenceCase_(name)]),
      hn('span', { class: 'cult-meta' }, [(paren ? sentenceCase_(paren) + ' · ' : '') + fecha]),
      hn('span', { class: 'cult-neg-state' }, [negativeLabel_(germ)]),
    ]);
  }
  var kids = [hn('span', { class: 'cult-germ' }, [sentenceCase_(germ)])];
  tags.forEach(function (t) {
    kids.push(hn('span', { class: 'cult-tag' }, [t]));
  });
  kids.push(hn('span', { class: 'cult-meta' }, [sentenceCase_(tipo).replace(/^(\S+) (por .*)$/, '$1 · $2') + ' · ' + fecha]));
  if (cuenta) kids.push(hn('span', { class: 'cult-count' }, [cuenta]));
  return hn('div', { class: 'cult-head' }, kids);
}

/** Resumen "ATB R: A, B | S: C, D" sin CMI: una fila por antibiótico, mismo lenguaje que la tabla. */
function atbSummaryNodes_(line) {
  var rows = [];
  var n = { r: 0, i: 0, s: 0 };
  var re = /(ESBL|R|I|S):\s*([^|\n]+)/g;
  var m;
  while ((m = re.exec(line))) {
    var k = m[1] === 'ESBL' ? 'r' : m[1].toLowerCase();
    m[2].replace(/\s*\+\d+\s*$/, '').split(/\s*,\s*/).filter(Boolean).forEach(function (name) {
      n[k]++;
      rows.push(
        hn('div', { class: 'cult-abx-row cult-abx-row--' + k }, [
          hn('span', { class: 'cult-abx-k' }, [k.toUpperCase()]),
          hn('span', { class: 'cult-abx-name' }, [name]),
        ])
      );
    });
  }
  if (!rows.length) return null;
  var tally = ['r', 'i', 's']
    .filter(function (k) {
      return n[k];
    })
    .map(function (k) {
      return n[k] + ' ' + { r: 'resistentes', i: 'indeterminados', s: 'sensibles' }[k];
    })
    .join(' · ');
  return hn('div', { class: 'cult-abx lab-out-atb' }, [
    hn('div', { class: 'cult-abx-grid' }, rows),
    hn('div', { class: 'cult-abx-legend' }, [tally]),
  ]);
}

function cultivoBodyLine_(body, lineRaw, sens, cuentaInHead) {
  var t = String(lineRaw || '').trim();
  if (!t || (cuentaInHead && /^Cuenta:/i.test(t))) return;
  // Membrete SOME colapsado (no es ATB ni cuenta).
  if (/^USER\b/i.test(t)) return;
  if (/\bLabo\s*-?\d+/i.test(t) && /\b(Campo|Feme)\b|\bLabo\s*-?\d+\*?\s+[A-Z]{2,6}\s+\d+/i.test(t)) return;
  var atb = null;
  if (/^ATB\b/i.test(t)) {
    atb = sens && sens.length ? hn('div', { class: 'cult-abx lab-out-atb' }, buildAtbTableNodes(sens)) : atbSummaryNodes_(t);
  }
  if (atb) {
    body.push(atb);
    return;
  }
  renderEntryNodes(lineRaw).forEach(function (nodes, idx) {
    body.push(hn('div', { class: idx === 0 ? 'out-line' : 'out-indent' }, nodes));
  });
}

/** Nodes the lab output draws for a cultivo chunk: one card per germ (see design board B). */
function buildCultivoOutputNodes(text, sourceText) {
  var raw = String(text || '');
  var chunks = raw
    .split(/\n\n+/)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  var parts = [];
  chunks.forEach(function (chunk) {
    var lines = chunk.split(/\n/);
    if (lines.length) lines[0] = insertSpaceAfterCultivoKeyword_(lines[0]);
    var germQuery = germQueryFromCultivoChunkHead(lines[0] || '');
    var sens = sourceText ? extractSensCrudasForGermFromSource(sourceText, germQuery) : null;
    var cuentaLine = lines.filter(function (l) {
      return /^Cuenta:/i.test(l.trim());
    })[0];
    var cuenta = cuentaLine ? cuentaLine.trim().replace(/^Cuenta:\s*/i, '') : '';
    var head = buildCultivoHeadNode_(lines[0], cuenta);
    var body = [];
    lines.forEach(function (lineRaw, li) {
      if (head && li === 0) return;
      cultivoBodyLine_(body, lineRaw, sens, head && cuenta);
    });
    parts.push(hn('div', { class: head ? 'cult-card' : 'cult-card cult-card--plain' }, head ? [head].concat(body) : body));
  });
  return parts;
}

export {
  copyCultivoCondensado,
  buildCultivoOutputNodes,
  isResLabChunkPureCultivo,
  parseCultureBlockFromLineArray,
  isCultureTableHeaderLine,
};
