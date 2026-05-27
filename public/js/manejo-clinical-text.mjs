/** Criterios clínicos escaneables — referencia compacta (fármaco | dosis). */

import { resolveClinicalDrugLink } from './manejo-clinical-drug-link.mjs';
import {
  buildAdminGridElement,
  parseDrugRegimen,
  resolveClinicalTextAdminView,
} from './manejo-proto-admin-display.mjs';

export { parseDrugRegimen };

function trim(s) {
  return String(s || '').trim();
}

function capitalizeLead(s) {
  s = trim(s);
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hasDosePattern(s) {
  return /\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|ui|mEq|ml|cc|%)\b/i.test(String(s || ''));
}

function truncatePreview(text, maxLen) {
  text = trim(text);
  if (text.length <= maxLen) return text;
  var cut = text.slice(0, maxLen - 1);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.55) cut = cut.slice(0, lastSpace);
  return cut + '…';
}

/**
 * @param {string} [sectionTitle]
 * @returns {'prose'|'checklist'}
 */
export function inferPresentationMode(sectionTitle) {
  var t = String(sectionTitle || '').toLowerCase();
  if (/definici|criterio diagn|concepto|clasificaci|signos de/.test(t)) return 'prose';
  if (/^meta\b|meta de|objetivo de|objetivo\b/.test(t)) return 'prose';
  return 'checklist';
}

/**
 * @param {string} text
 * @param {'prose'|'checklist'} [mode]
 * @returns {string[]}
 */
function splitCommaListParts(text) {
  text = trim(text);
  if (!text || text.indexOf(',') < 0) return [];

  var parts = [];
  var depth = 0;
  var buf = '';
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      parts.push(trim(buf));
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (trim(buf)) parts.push(trim(buf));

  return parts
    .map(function (part) {
      return trim(part.replace(/\.\s*$/, ''));
    })
    .filter(Boolean);
}

function shouldSplitCommaList(text, sectionTitle) {
  text = trim(text);
  if (!/,/.test(text)) return false;

  var section = String(sectionTitle || '').toLowerCase();
  if (/precipitante|causa|factor|etiolog|descartar|revisar|evaluar|buscar/.test(section)) {
    return true;
  }

  if (hasDosePattern(text) && splitDrugAlternatives(text).length >= 2) return false;

  var parts = splitCommaListParts(text);
  if (parts.length < 3) return false;
  if (!parts.every(function (part) {
    return part.length <= 80;
  })) {
    return false;
  }
  if (/^si\b/i.test(parts[0]) && parts.length <= 3) return false;
  return true;
}

export function splitClinicalLines(text, mode) {
  var s = trim(text);
  if (!s) return [];
  mode = mode || 'checklist';

  var chunks = s.split(/\s*;\s*/).map(trim).filter(Boolean);
  if (mode === 'prose') {
    if (chunks.length > 1) return chunks.map(capitalizeLead);
    if (s.indexOf('. ') >= 0) {
      var sentences = s.split(/(?<=[.!?])\s+/).map(trim).filter(Boolean);
      if (sentences.length >= 2 && sentences.length <= 4) {
        return sentences.map(capitalizeLead);
      }
    }
    return [capitalizeLead(s)];
  }

  var lines = [];
  chunks.forEach(function (chunk) {
    if (shouldSplitCommaList(chunk, '')) {
      splitCommaListParts(chunk).forEach(function (part) {
        lines.push(capitalizeLead(part));
      });
      return;
    }
    if (chunk.indexOf('. ') < 0) {
      lines.push(capitalizeLead(chunk));
      return;
    }
    var sentences = chunk.split(/(?<=[.!?])\s+/).map(trim).filter(Boolean);
    if (
      sentences.length >= 2 &&
      sentences.every(function (sent) {
        return sent.length <= 120;
      })
    ) {
      sentences.forEach(function (sent) {
        lines.push(capitalizeLead(sent));
      });
      return;
    }
    lines.push(capitalizeLead(chunk));
  });

  return lines.length ? lines : [s];
}

export var splitClinicalUnits = splitClinicalLines;

/**
 * @param {string} line
 * @returns {string[]}
 */
export function splitDrugAlternatives(line) {
  line = trim(line);
  if (!line || !hasDosePattern(line)) return [line];

  var parts = line
    .split(/\s*,\s*(?=[A-Za-zÁÉÍÓÚáéíóúÑñ/])|\s+\bo\b\s+(?=[A-Za-zÁÉÍÓÚáéíóúÑñ/])/i)
    .map(trim)
    .filter(Boolean);

  if (parts.length >= 2 && parts.filter(hasDosePattern).length >= 2) {
    return parts.map(capitalizeLead);
  }
  return [line];
}

/**
 * @param {string} text
 * @returns {{ label: string, detail: string, addon?: boolean }}
 */
export function parseCriterionPart(text) {
  text = capitalizeLead(text);
  if (!text) return { label: '—', detail: '' };

  if (/(→|->)/.test(text)) {
    return { label: text, detail: '' };
  }

  var addMatch = text.match(/^Agregar\s+([A-Za-zÁÉÍÓÚáéíóúÑñ/+\-().]+?)\s+(.+)$/i);
  if (addMatch) {
    return {
      label: capitalizeLead(addMatch[1]),
      detail: capitalizeLead(addMatch[2]),
      addon: true,
    };
  }

  var m = text.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9/+\-().]{2,42}?)\s+(\d.+)$/);
  if (m && hasDosePattern(m[2])) {
    return { label: trim(m[1]), detail: trim(m[2]) };
  }

  var colon = text.match(/^([^:]{3,48}):\s*(.+)$/);
  if (colon && colon[2].length <= 80) {
    return { label: trim(colon[1]), detail: trim(colon[2]) };
  }

  var paren = text.match(/^(.+?)\s+\(([^)]+)\)\s*\.?\s*$/);
  if (paren && trim(paren[1]).length >= 2 && trim(paren[1]).length <= 48) {
    return { label: capitalizeLead(paren[1]), detail: capitalizeLead(paren[2]) };
  }

  return { label: text, detail: '' };
}

/**
 * @param {string} text
 * @param {string} [sectionTitle]
 * @returns {Array<{ label: string, detail: string, addon?: boolean }>}
 */
export function expandClinicalCriteria(text, sectionTitle) {
  var mode = inferPresentationMode(sectionTitle);
  var lines = splitClinicalLines(text, mode);
  if (
    mode === 'checklist' &&
    lines.length <= 1 &&
    shouldSplitCommaList(text, sectionTitle)
  ) {
    lines = splitCommaListParts(text).map(capitalizeLead);
  }
  var out = [];

  lines.forEach(function (line) {
    splitDrugAlternatives(line).forEach(function (part) {
      out.push(parseCriterionPart(part));
    });
  });

  return out;
}

function resolveLinkForLabel(label, opts) {
  if (!opts || !opts.linkDrugs || !label) return null;
  if (typeof opts.resolveDrugLink === 'function') {
    return opts.resolveDrugLink(label);
  }
  if (opts.allProtocols) {
    return resolveClinicalDrugLink(label, opts.allProtocols);
  }
  return null;
}

function appendDrugLabel(parent, label, opts) {
  var link = resolveLinkForLabel(label, opts);
  if (link && typeof opts.onDrugLink === 'function') {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-clinical-drug-link';
    btn.textContent = label;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      opts.onDrugLink(link);
    });
    parent.appendChild(btn);
    return;
  }
  var span = document.createElement('span');
  span.textContent = label;
  parent.appendChild(span);
}

function buildDefinitionBoxes(lines, opts) {
  var grid = document.createElement('div');
  grid.className =
    'manejo-clinical-def-grid' + (opts.compact ? ' manejo-clinical-def-grid--compact' : '');

  lines.forEach(function (line) {
    var box = document.createElement('div');
    box.className = 'manejo-clinical-def-box';
    box.textContent = line;
    grid.appendChild(box);
  });

  return grid;
}

function buildCriteriaList(criteria, opts) {
  var list = document.createElement('ul');
  list.className =
    'manejo-clinical-criteria' + (opts.compact ? ' manejo-clinical-criteria--compact' : '');

  criteria.forEach(function (item) {
    var li = document.createElement('li');
    li.className = 'manejo-clinical-criterion';
    if (item.addon) li.className += ' manejo-clinical-criterion--addon';
    if (!item.detail) li.className += ' manejo-clinical-criterion--single';

    var main = document.createElement('span');
    main.className = 'manejo-clinical-criterion-main';
    if (item.addon) {
      var mark = document.createElement('span');
      mark.className = 'manejo-clinical-criterion-addon-mark';
      mark.textContent = '+';
      main.appendChild(mark);
    }
    appendDrugLabel(main, item.label, opts);
    li.appendChild(main);

    if (item.detail) {
      var detail = document.createElement('span');
      detail.className = 'manejo-clinical-criterion-detail';
      detail.textContent = item.detail;
      li.appendChild(detail);
    }

    list.appendChild(li);
  });

  return list;
}

/**
 * @param {string|string[]} value
 * @param {{
 *   compact?: boolean,
 *   sectionTitle?: string,
 *   mode?: 'prose'|'checklist',
 *   linkDrugs?: boolean,
 *   allProtocols?: object[],
 *   resolveDrugLink?: (name: string) => object|null,
 *   onDrugLink?: (link: object) => void,
 * }} [opts]
 * @returns {HTMLElement}
 */
export function buildClinicalTextElement(value, opts) {
  opts = opts || {};
  var wrap = document.createElement('div');
  wrap.className =
    'manejo-clinical-text' + (opts.compact ? ' manejo-clinical-text--compact' : '');

  if (Array.isArray(value)) {
    var items = value.map(trim).filter(Boolean);
    if (!items.length) {
      wrap.textContent = '—';
      return wrap;
    }
    var arrayCard = document.createElement('div');
    arrayCard.className =
      'manejo-proto-admin' + (opts.compact ? ' manejo-proto-admin--compact' : '');
    arrayCard.appendChild(
      buildCriteriaList(
        items.map(function (item) {
          return parseCriterionPart(item);
        }),
        opts
      )
    );
    wrap.appendChild(arrayCard);
    return wrap;
  }

  var text = trim(value);
  if (!text) {
    wrap.textContent = '—';
    return wrap;
  }

  var adminView = resolveClinicalTextAdminView(text, {
    label: opts.itemLabel,
    title: opts.itemLabel || opts.sectionTitle,
  });
  if (adminView) {
    var sectionTitle = trim(opts.sectionTitle || '');
    var hideDrug =
      !!adminView.drug &&
      !!sectionTitle &&
      sectionTitle.toLowerCase() === String(adminView.drug).toLowerCase();
    var adminEl = buildAdminGridElement(
      adminView,
      Object.assign({}, opts, { hideDrug: hideDrug })
    );
    if (trim(adminEl.textContent) && adminEl.textContent !== '—') {
      wrap.appendChild(adminEl);
      return wrap;
    }
  }

  var mode = opts.mode || inferPresentationMode(opts.sectionTitle);
  var lines = splitClinicalLines(text, mode);

  if (mode === 'prose') {
    if (opts.proseBlock) {
      wrap.appendChild(buildDefinitionBoxes([text], opts));
      return wrap;
    }
    wrap.appendChild(buildDefinitionBoxes(lines, opts));
    return wrap;
  }

  var criteria = expandClinicalCriteria(text, opts.sectionTitle);
  var card = document.createElement('div');
  card.className =
    'manejo-proto-admin' + (opts.compact ? ' manejo-proto-admin--compact' : '');
  card.appendChild(buildCriteriaList(criteria, opts));
  wrap.appendChild(card);
  return wrap;
}

export function clinicalTextPreview(text, maxLen, sectionTitle) {
  maxLen = maxLen || 96;
  var criteria = expandClinicalCriteria(text, sectionTitle);
  if (!criteria.length) return '';

  var first = criteria[0];
  var line = first.detail ? first.label + ' · ' + first.detail : first.label;
  return truncatePreview(line, maxLen);
}

export function recommendationCardTitle(item, sectionTitle, opts) {
  opts = opts || {};
  if (opts.missing) return opts.missing;
  if (item.label) return item.label;
  if (sectionTitle) return sectionTitle;
  var first = expandClinicalCriteria(item.text, sectionTitle)[0];
  if (first) {
    var t = first.detail ? first.label + ' · ' + first.detail : first.label;
    if (t.length <= 72) return t;
  }
  return clinicalTextPreview(item.text, 72, sectionTitle);
}

export function buildClinicalKvBlock(label, value, opts) {
  opts = opts || {};
  var kv = document.createElement('div');
  kv.className = 'manejo-kv' + (opts.wide ? ' manejo-kv--wide' : '');
  var lbl = document.createElement('span');
  lbl.className = 'manejo-kv-label';
  lbl.textContent = label;
  var val = document.createElement('div');
  val.className = 'manejo-kv-val';
  val.appendChild(
    buildClinicalTextElement(value, {
      compact: opts.compact !== false,
      sectionTitle: label,
      linkDrugs: opts.linkDrugs,
      allProtocols: opts.allProtocols,
      resolveDrugLink: opts.resolveDrugLink,
      onDrugLink: opts.onDrugLink,
    })
  );
  kv.appendChild(lbl);
  kv.appendChild(val);
  return kv;
}

export function buildClinicalPreviewElement(text, maxLen, sectionTitle) {
  var preview = clinicalTextPreview(text, maxLen || 110, sectionTitle);
  if (!preview) return null;
  var p = document.createElement('p');
  p.className = 'manejo-pathology-indication-preview';
  p.textContent = preview;
  return p;
}
