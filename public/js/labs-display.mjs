/**
 * Lab result HTML display helpers (extracted from labs.js for boot-graph slimming).
 */
import { bhFieldKeyFromOutputLabel, flattenBhHemOnlyVisible } from './labs-bh.mjs';
import { insertSpaceAfterCultivoKeyword_ } from './labs-cultivo-scan.mjs';

function normalizeGasometryInterpretationLine_(line) {
  var s = String(line == null ? '' : line);
  return /^Interpretación gasometría:/i.test(s.trim()) ? s.toUpperCase() : s;
}

export function escTxt(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatLabSectionLabel(label, lineIndex) {
  var t = String(label || '').trim().replace(/:$/, '');
  if (/^Coag\.?$/i.test(t)) return 'COAG';
  if (lineIndex === 0) return t;
  return t;
}

function isLabSectionLabel(label, lineIndex) {
  var t = String(label || '').trim().replace(/:$/, '');
  if (/^Coag\.?$/i.test(t) || /^COAG$/i.test(t)) return true;
  if (lineIndex !== 0) return false;
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|EU|CUANTORINA|PROT12H|PROT24H|PltCit|FROTIS|SEROL|GS|HECES|COAG|LIPASA|TROP|TIR|ENDO|CARD|FE|FEB|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)$/i.test(
    t
  );
}

export function isLabSectionHeaderHtml(html) {
  return /<span class="section-lbl">/.test(String(html || ''));
}

/** Cabecera de sección (primer token de la primera línea, sin ':' final). Coag → BH (misma familia). */
function entryTrendSectionKey_(text) {
  var first = (String(text || '').split('\n')[0] || '').replace(/\t/g, ' ');
  var head = first.split(' ')[0].trim().replace(/:$/, '');
  if (/^COAG$/i.test(head) || /^Coag\.?$/i.test(head)) return 'BH';
  return head;
}

/** Índice de token de valor → etiqueta del campo que lo precede (mismo recorrido que parsearSecciones). */
function fieldLabelsByValueIndex_(tokens) {
  var map = Object.create(null);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    if (!label || label === '-') {
      i++;
      continue;
    }
    var next = tokens[i + 1];
    if (next === undefined) {
      i++;
      continue;
    }
    if (!isNaN(parseFloat(next.replace('*', '')))) {
      map[i + 1] = label;
      i += 2;
    } else {
      i++;
    }
  }
  return map;
}

function trendArrowHtml_(info) {
  if (!info || !info.trend) return '';
  var cls = info.trend === 'up' ? 'lab-trend-up' : 'lab-trend-down';
  var label = info.trend === 'up' ? 'en aumento' : 'en descenso';
  return (
    '<span class="lab-trend-arrow ' + cls + '" aria-label="' + label + '" title="' + label + ' vs. toma previa"></span>'
  );
}

export function renderToken(tok, trendInfo) {
  if (!tok) return tok;
  if (tok.endsWith('*')) {
    var inner = escTxt(tok.slice(0, -1));
    return (
      '<strong class="lab-value-altered" title="Fuera de rango de referencia">' +
      inner +
      trendArrowHtml_(trendInfo) +
      '</strong><span class="lab-value-star" aria-hidden="true">*</span>'
    );
  }
  return escTxt(tok);
}

/**
 * @param {string} text un chunk resLab (una o más líneas, "SECCION\tclave val clave val…").
 * @param {(sectionKey: string, fieldKey: string) => ({trend, delta}|null)} [trendLookup]
 *   Opcional. Ausente = comportamiento y HTML idénticos a antes de Fase 5.
 */
/**
 * Fase 5 (2a/2b) — envuelve etiqueta ("BH") y valores en dos columnas (`.lab-row-label` /
 * `.lab-row-values`) para que `#lab-output-box` pueda dibujarlas como grid (64px + 1fr,
 * ver `lab.css`). Fuera de esa tarjeta el HTML sigue leyéndose en línea (sin `display:grid`),
 * así que otros consumidores de `renderEntry` (censo, vista previa) no cambian de forma.
 * Líneas "estructuradas" (clave numérica, ej. BH/QS/ESC) envuelven cada valor en
 * `.lab-row-value` para el gap tipo chip; líneas de prosa (ej. Frotis) no.
 */
export function renderEntry(text, trendLookup) {
  text = flattenBhHemOnlyVisible(normalizeGasometryInterpretationLine_(text));
  var sectionKey = trendLookup ? entryTrendSectionKey_(text) : '';
  var isBhFamily = sectionKey === 'BH';
  return text.split('\n').map(function (line, li) {
    if (li === 0) line = insertSpaceAfterCultivoKeyword_(line);
    var tabIdx = line.indexOf('\t');
    if (tabIdx >= 0) {
      var label = line.substring(0, tabIdx);
      var rest = line.substring(tabIdx + 1);
      var lh = isLabSectionLabel(label, li)
        ? '<span class="section-lbl">' + escTxt(formatLabSectionLabel(label, li)) + '</span>'
        : escTxt(label);
      var restTokens = rest.split(' ');
      var labelByValueIdx = fieldLabelsByValueIndex_(restTokens);
      var isStructured = Object.keys(labelByValueIdx).length > 0;
      var rh;
      if (isStructured) {
        rh = restTokens
          .map(function (tok, ti) {
            if (!tok) return '';
            if (tok === '-') return '<span class="lab-row-value lab-row-value-muted">-</span>';
            var trendInfo = null;
            if (trendLookup && labelByValueIdx[ti] && tok.endsWith('*')) {
              var fieldKey = isBhFamily
                ? bhFieldKeyFromOutputLabel(labelByValueIdx[ti])
                : labelByValueIdx[ti];
              trendInfo = trendLookup(sectionKey, fieldKey);
            }
            return '<span class="lab-row-value">' + renderToken(tok, trendInfo) + '</span>';
          })
          .filter(Boolean)
          .join(' ');
      } else {
        rh = restTokens
          .map(function (tok) {
            if (!tok) return tok;
            if (tok === '-') return '<span class="text-gray-500">-</span>';
            return renderToken(tok);
          })
          .join(' ');
      }
      return (
        '<span class="lab-row-label">' +
        lh +
        '</span> <span class="lab-row-values' +
        (isStructured ? ' lab-row-values-chips' : '') +
        '">' +
        rh +
        '</span>'
      );
    }
    var plain = line
      .split(' ')
      .map(function (tok, ti) {
        if (!tok) return tok;
        if (li === 0 && ti === 0) return '<span class="section-lbl">' + escTxt(tok) + '</span>';
        if (tok === '-') return '<span class="text-gray-500">-</span>';
        return renderToken(tok);
      })
      .join(' ');
    // Líneas sin tab que no son la cabecera (li > 0, ej. EGO): sin este wrapper cada
    // <strong>/span queda como hijo directo de `.out-indent`, que en #lab-output-box es
    // `display: grid` (grilla 64px + 1fr para las filas con .lab-row-label/.lab-row-values).
    // La grilla "blockifica" cada hijo suelto y lo auto-coloca en su propia celda, partiendo
    // la línea en un campo por renglón. Un solo span que ocupe las dos columnas la mantiene junta.
    return li === 0 ? plain : '<span class="lab-row-values lab-row-values-full">' + plain + '</span>';
  });
}
