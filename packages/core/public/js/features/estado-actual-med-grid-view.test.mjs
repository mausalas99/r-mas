import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { normHtml } from './preact-html-compare.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';
import { buildMedDropdownOptions } from './estado-actual-meds.mjs';
import { escHtml, escAttr } from '../dom-escape.mjs';
import { classifyMedicationSoapCategory, soapDestinationSelectOptionsHtml, mapSoapDestKeyToEaField } from '../med-receta-core.mjs';
import { partitionNmMedLines } from '../nm-antidiabetic-detect.mjs';
import { parseMedFieldItems, EA_MED_FIELD_LABELS, prepareMedBlockData, medGridModel, medRecetaOptions } from './estado-actual-med-ui.mjs';

const view = await loadJsx(import.meta.url, `import { MedGrid, MedRecetaSelect } from './estado-actual-med-grid-view.jsx';
  export const grid = (model) => renderToString(<MedGrid model={model} />);
  export const select = (catKey, options) => renderToString(<MedRecetaSelect catKey={catKey} options={options} />);`);

// ---- Old string builders (estado-actual-med-ui.mjs before the port), kept verbatim as the oracle ----
// Name first, dose/route/frequency muted: the eye scans drug names down the
// column and reads the dose only when it needs it.
function medItemTextHtml(item) {
  var cut = item.search(/\s\d/);
  if (cut <= 0) return escHtml(item);
  return (
    '<span class="ea-med-item-name">' + escHtml(item.slice(0, cut)) + '</span> ' +
    '<span class="ea-med-item-dose">' + escHtml(item.slice(cut + 1)) + '</span>'
  );
}

var NOREPI_LINE_RE = /^(\S*(?:NOREPINEFRINA|NORADRENALINA)\S*)(\s+\d+(?:[.,]\d+)?\s*(?:MCG|MG|G)(?:\/[A-Z]+)*)?/i;

/** @returns {string} mcg/min of a norepinephrine line, '' when it has none */
function norepiRateOfLine(line) {
  var m = String(line || '').match(/^\S*(?:NOREPINEFRINA|NORADRENALINA)\S*\s+(\d+(?:[.,]\d+)?)\s*MCG\/MIN\b/i);
  return m ? m[1].replace(',', '.') : '';
}

/** Puts «N MCG/MIN» where the norepinephrine dose was; null if the line is not norepinephrine. */
function setNorepiRateOnLine(line, rate) {
  var r = String(rate).trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(r) || !NOREPI_LINE_RE.test(line)) return null;
  return String(line).replace(NOREPI_LINE_RE, function (_m, name) {
    return name + ' ' + r + ' MCG/MIN';
  });
}

function vasopRateBoxHtml(item, idx, src) {
  if (!NOREPI_LINE_RE.test(item)) return '';
  return (
    '<label class="ea-vasop-rate">' +
    '<input type="text" inputmode="decimal" class="ea-input ea-vasop-rate-input" data-ea-vasop-src="' +
    src +
    '" data-ea-vasop-rate="' +
    idx +
    '" value="' +
    escAttr(norepiRateOfLine(item)) +
    '" placeholder="0" aria-label="Velocidad de norepinefrina en mcg/min">' +
    '<span class="ea-muted">mcg/min</span></label>'
  );
}

function medChipHtml(item, key, idx, pending) {
  var text = '<span class="ea-med-chip-text" title="' + escAttr(item) + '">' + medItemTextHtml(item) + '</span>';
  var rate = key === 'vasop' ? vasopRateBoxHtml(item, idx, pending ? 'pending' : 'items') : '';
  if (!pending) {
    return (
      '<span class="ea-med-chip ea-med-chip--confirmed">' +
      '<button type="button" class="ea-med-chip-text" data-ea-med-remove="' + escAttr(key) +
      '" data-ea-med-idx="' + idx + '" aria-label="Quitar ' + escAttr(item) + '" title="Quitar">' +
      medItemTextHtml(item) + '</button>' + rate + '</span>'
    );
  }
  var args = escAttr(JSON.stringify([key, idx]));
  return (
    '<span class="ea-med-chip ea-med-chip--pending">' + text + rate +
    '<span class="ea-med-chip-tag">de receta</span>' +
    '<button type="button" class="ea-med-chip-btn ea-med-chip-btn--ok" data-onclick="confirmEaMedProposalItem" data-onclick-args=\'' + args + '\' aria-label="Confirmar ' + escAttr(item) + '">✓</button>' +
    '<button type="button" class="ea-med-chip-btn" data-onclick="discardEaMedProposalItem" data-onclick-args=\'' + args + '\' aria-label="Descartar ' + escAttr(item) + '">×</button>' +
    '</span>'
  );
}

function medRowHtml(key, label, chips) {
  return (
    '<div class="ea-med-row" data-ea-med-cat="' + escAttr(key) + '">' +
    '<div class="ea-med-row-label">' + escHtml(label) + '</div>' +
    '<div class="ea-med-chips">' +
    (chips || '<span class="ea-muted">Sin medicamentos</span>') +
    '</div></div>'
  );
}

// One row per category: confirmed chips first, then the pending ones.
function medCategoryRowsHtml(key, block) {
  var pending = parseMedFieldItems(block.pendingVal).map(function (item, idx) {
    return medChipHtml(item, key, idx, true);
  }).join('');
  var label = EA_MED_FIELD_LABELS[key] || key;
  if (key === 'nm') {
    var part = partitionNmMedLines(block.items);
    var chipsOf = function (lines, indices) {
      return lines.map(function (item, i) { return medChipHtml(item, key, indices[i], false); }).join('');
    };
    if (part.antidiabeticos.length) {
      return (
        medRowHtml(key, 'Antidiabéticos', chipsOf(part.antidiabeticos, part.antidiabeticIndices)) +
        medRowHtml(key, label, chipsOf(part.other, part.otherIndices) + pending)
      );
    }
    return medRowHtml(key, label, chipsOf(part.other, part.otherIndices) + pending);
  }
  var chips = block.items.map(function (item, idx) { return medChipHtml(item, key, idx, false); }).join('');
  return medRowHtml(key, label, chips + pending);
}

function medAddPanelHtml() {
  var cats = MED_FIELD_KEYS.map(function (k) {
    return '<option value="' + escAttr(k) + '"' + (k === 'nm' ? ' selected' : '') + '>' + escHtml(EA_MED_FIELD_LABELS[k] || k) + '</option>';
  }).join('');
  return (
    '<div class="ea-med-add-panel" hidden data-ea-med-add-panel>' +
    '<label for="ea-med-add-text">Fármaco y dosis</label>' +
    '<input type="text" id="ea-med-add-text" class="ea-input" data-ea-med-add-text placeholder="Ondansetrón 8 mg IV c/8h">' +
    '<label for="ea-med-add-cat">Categoría</label>' +
    '<select id="ea-med-add-cat" class="ea-input" data-ea-med-add-cat>' + cats + '</select>' +
    '<button type="button" class="ea-btn ea-btn--success" data-ea-med-add-save>Agregar</button>' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-ea-med-from-receta>Desde receta</button>' +
    '<span data-ea-med-receta-slot></span>' +
    '</div>'
  );
}

/** Receta drugs that fit one category, as a select the grid change handler already understands. */
function medRecetaSelectHtml(key, activeId, medRecetaByPatient) {
  var options = buildMedDropdownOptions(activeId, key, medRecetaByPatient, classifyMedicationSoapCategory);
  if (!options.length) return '<span class="ea-muted">La receta no tiene fármacos para esta categoría</span>';
  return (
    '<select class="ea-input" data-ea-med-add-select="' + escAttr(key) + '" aria-label="Elegir de la receta">' +
    '<option value="">Elegir de la receta…</option>' +
    options.map(function (opt) {
      return '<option value="' + escAttr(opt.value) + '">' + escHtml(opt.label) + '</option>';
    }).join('') +
    '</select>'
  );
}

function renderMedCategoryPickOptions(keys) {
  if (!keys.length) {
    return '<option value="">Todas las categorías visibles</option>';
  }
  return (
    '<option value="">+ Categoría</option>' +
    soapDestinationSelectOptionsHtml(escHtml, {
      omitEmpty: true,
      includeKeys: keys,
      mapKey: mapSoapDestKeyToEaField,
      labels: EA_MED_FIELD_LABELS,
    })
  );
}

function parseRevealedMedKeys(grid) {
  if (!grid) return [];
  var raw = grid.getAttribute('data-ea-med-revealed');
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function medGridInnerHtml(monitoreo, activeId, medRecetaByPatient, revealedKeys, refDate) {
  var blocks = {};
  var active = 0;
  var pendingTotal = 0;
  MED_FIELD_KEYS.forEach(function (key) {
    var b = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate);
    blocks[key] = b;
    active += b.items.length;
    pendingTotal += parseMedFieldItems(b.pendingVal).length;
  });
  var shown = MED_FIELD_KEYS.filter(function (key) {
    return blocks[key].items.length > 0 || blocks[key].pendingVal.length > 0 || revealedKeys.indexOf(key) >= 0;
  });
  var hidden = MED_FIELD_KEYS.filter(function (key) {
    return shown.indexOf(key) < 0;
  });
  return (
    '<div class="ea-med-head">' +
    '<h3 class="ea-med-title">Medicamentos</h3>' +
    '<span class="ea-muted">' + (active + pendingTotal) + ' activos</span>' +
    (pendingTotal ? '<span class="ea-med-pending-count">' + pendingTotal + ' por confirmar</span>' : '') +
    '<span class="ea-med-head-spacer"></span>' +
    (pendingTotal ? '<button type="button" class="ea-btn ea-btn--ghost" data-onclick="confirmAllEaMedProposals">Aceptar todas</button>' : '') +
    '<button type="button" class="ea-btn ea-btn--success" data-ea-med-add-toggle>+ Agregar</button>' +
    '</div>' +
    medAddPanelHtml() +
    shown.map(function (key) { return medCategoryRowsHtml(key, blocks[key]); }).join('') +
    '<div class="ea-med-add-category-row"' + (hidden.length ? '' : ' hidden') + '>' +
    '<select class="ea-io-link ea-med-pick-category" data-ea-med-pick-category aria-label="Añadir categoría de medicamento">' +
    renderMedCategoryPickOptions(hidden) +
    '</select></div>'
  );
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').emptyMonitoreo>} monitoreo
 * @param {string | null} activeId
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 * @param {string[]} [revealedKeys]
 * @returns {string}
 */
function renderMedCategoryGrid(monitoreo, activeId, medRecetaByPatient, revealedKeys, refDate) {
  revealedKeys = Array.isArray(revealedKeys) ? revealedKeys : [];
  return (
    '<div class="ea-clinico-med-grid" data-ea-med-revealed="' + escAttr(JSON.stringify(revealedKeys)) + '">' +
    medGridInnerHtml(monitoreo, activeId, medRecetaByPatient, revealedKeys, refDate) +
    '</div>'
  );
}


// ---- Comparison ----
// Serialization only: Preact closes void tags with "/>", prints boolean data-* as ="" and double-quotes JSON args.
const norm = (s) => normHtml(s)
  .replace(/ ?\/>/g, '>')
  .replace(/ (data-[a-z-]+)(?=[ >])/g, ' $1')
  .replace(/data-onclick-args="(\[.*?\])"(?= )/g, "data-onclick-args='$1'")
  .replace(/<option([^>]*?) selected([^>]*)>/g, '<option$1$2 selected>')
  .replace(/<option value="([^"]*)" selected/g, '<option value="$1" selected');
const NOW = new Date(2026, 10, 12, 9, 0, 0);
const mon = (ec, pend) => ({ estadoClinico: ec, pendienteReceta: pend });
const SCENARIOS = {
  empty: [mon({}, {}), []],
  revealed: [mon({}, {}), ['antihta', 'nm']],
  busy: [
    mon({
      analgesia: "PARACETAMOL 1 g IV c/8h | KETOROLACO 30 mg IV c/8h",
      abx: 'CEFTRIAXONA 1 g IV c/24h | VANCOMICINA',
      vasop: 'NOREPINEFRINA 8 MCG/MIN | VASOPRESINA 0.03 UI/min',
      nm: 'INSULINA GLARGINA 20 UI SC c/24h | RESCATES DE INSULINA | OMEPRAZOL 40 mg IV c/12h',
      sedacion: 'FENTANILO <5> mcg & "x" | MIDAZOLAM \'y\' 2 mg',
    }, {
      vasop: 'NOREPINEFRINA 12 MCG/MIN | DOBUTAMINA 5 MCG/KG/MIN',
      antihta: 'AMLODIPINO 5 mg VO c/24h',
      nm: 'METFORMINA 850 mg VO c/12h',
    }),
    ['estatinas'],
  ],
  pendingOnly: [mon({}, { analgesia: 'PARACETAMOL 1 g VO c/6h' }), []],
  allVisible: [mon(Object.fromEntries(MED_FIELD_KEYS.map((k) => [k, 'MED ' + k + ' 1 mg VO'])), {}), []],
};
for (const [name, [m, revealed]] of Object.entries(SCENARIOS)) {
  test(`med grid equals the old builder: ${name}`, () => {
    const old = medGridInnerHtml(m, null, {}, revealed, NOW);
    const neu = view.grid(medGridModel(m, null, {}, revealed, NOW));
    assert.equal(norm(neu), norm(old));
  });
}

test('receta select equals the old builder (options and empty hint)', () => {
  const rx = { p1: { items: [{ nombreRaw: 'PARACETAMOL', dosisRaw: '1 g', frecuenciaRaw: 'c/8h', viaRaw: 'IV' }, { nombreRaw: 'ONDANSETRON', dosisRaw: '8 mg', frecuenciaRaw: 'c/8h', viaRaw: 'IV' }] } };
  for (const key of ['analgesia', 'antiemeticos', 'estatinas']) {
    assert.equal(norm(view.select(key, medRecetaOptions(key, 'p1', rx))), norm(medRecetaSelectHtml(key, 'p1', rx)), key);
  }
  assert.equal(norm(view.select('nm', medRecetaOptions('nm', null, {}))), norm(medRecetaSelectHtml('nm', null, {})));
});
