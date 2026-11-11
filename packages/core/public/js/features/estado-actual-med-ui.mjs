import { MED_FIELD_KEYS, ensureMonitoreo } from './estado-actual-data.mjs';
import { buildMedDropdownOptions, resolveEaAbxFechaActualizacion, ensureAbxDiaAnchorDate } from './estado-actual-meds.mjs';
import { ensureRecetaProposalDismissed } from './estado-actual-meds-core.mjs';
import { handleMedGridClick } from './estado-actual-med-grid-click.mjs';
import {
  rewriteAbxDisplayText,
  classifyMedicationSoapCategory,
  soapDestinationSelectOptionsHtml,
  mapSoapDestKeyToEaField,
} from '../med-receta-core.mjs';
import { partitionNmMedLines } from '../nm-antidiabetic-detect.mjs';

/** @type {Record<string, string>} */
export const EA_MED_FIELD_LABELS = {
  analgesia: 'Analgésicos / antipiréticos',
  antiemeticos: 'Antieméticos',
  sedacion: 'Sedación / delirium',
  antiepilepticos: 'Antiepilépticos',
  antiparkinsonianos: 'Antiparkinsonianos',
  antidotos: 'Antídotos',
  viaAerea: 'Vía aérea',
  abx: 'Antibióticos',
  transfusiones: 'Transfusiones',
  antihta: 'Antihipertensivos',
  diureticos: 'Diuréticos',
  antitromboticos: 'Tromboprofilaxis',
  anticoagulacion: 'Anticoagulación',
  antiarritmicos: 'Antiarrítmicos',
  estatinas: 'Estatinas',
  vasop: 'Vasopresores',
  nm: 'NM',
};

import { escHtml, escAttr } from '../dom-escape.mjs';

export function parseMedFieldItems(raw) {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw)
    .split(' | ')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

export function serializeMedFieldItems(items) {
  return (items || [])
    .map(function (s) {
      return String(s).trim();
    })
    .filter(Boolean)
    .join(' | ');
}

function ensureObjectField(obj, name) {
  if (!obj[name] || typeof obj[name] !== 'object') obj[name] = {};
}

// Typed by hand, not from the Receta: the Receta prune must keep it.
function rememberManualMed(monitoreo, key, line) {
  ensureObjectField(monitoreo, 'manualMeds');
  var manual = Array.isArray(monitoreo.manualMeds[key]) ? monitoreo.manualMeds[key] : [];
  if (manual.indexOf(line) === -1) manual.push(line);
  monitoreo.manualMeds[key] = manual;
}

export function addMedFieldItem(monitoreo, key, text, ctx) {
  if (!monitoreo || !key || !text || !String(text).trim()) return;
  ensureObjectField(monitoreo, 'estadoClinico');
  var items = parseMedFieldItems(/** @type {Record<string, unknown>} */ (monitoreo.estadoClinico)[key]);
  var next = String(text).trim();
  if (items.indexOf(next) === -1) items.push(next);
  /** @type {Record<string, string>} */ (monitoreo.estadoClinico)[key] = serializeMedFieldItems(items);
  if (ctx && ctx.manual) rememberManualMed(monitoreo, key, next);
  ensureObjectField(monitoreo, 'confirmado');
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado)[key] = true;
  if (key === 'abx') {
    ensureAbxDiaAnchorDate(monitoreo, ctx && ctx.activeId, ctx && ctx.medRecetaByPatient);
  }
  if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object') {
    /** @type {Record<string, string>} */ (monitoreo.pendienteReceta)[key] = '';
  }
}

export function removeMedFieldItem(monitoreo, key, index) {
  if (!monitoreo || !monitoreo.estadoClinico) return;
  var items = parseMedFieldItems(monitoreo.estadoClinico[key]);
  if (index < 0 || index >= items.length) return;
  var removed = items.splice(index, 1)[0];
  if (monitoreo.manualMeds && Array.isArray(monitoreo.manualMeds[key])) {
    monitoreo.manualMeds[key] = monitoreo.manualMeds[key].filter(function (line) { return line !== removed; });
  }
  monitoreo.estadoClinico[key] = serializeMedFieldItems(items);
  if (!monitoreo.confirmado) monitoreo.confirmado = {};
  monitoreo.confirmado[key] = items.length > 0;
}

// One proposed drug at a time. The pending text is one `' | '` string per
// category, so split it, move one item, and write back what is left.
export function confirmMedProposalItem(monitoreo, key, index, ctx) {
  if (!monitoreo || !key || !monitoreo.pendienteReceta) return;
  var pendingItems = parseMedFieldItems(monitoreo.pendienteReceta[key]);
  if (index < 0 || index >= pendingItems.length) return;
  var item = pendingItems.splice(index, 1)[0];
  ensureObjectField(monitoreo, 'estadoClinico');
  var items = parseMedFieldItems(monitoreo.estadoClinico[key]);
  if (items.indexOf(item) === -1) items.push(item);
  monitoreo.estadoClinico[key] = serializeMedFieldItems(items);
  ensureObjectField(monitoreo, 'confirmado');
  monitoreo.confirmado[key] = true;
  monitoreo.pendienteReceta[key] = serializeMedFieldItems(pendingItems);
  if (key === 'abx') {
    ensureAbxDiaAnchorDate(monitoreo, ctx && ctx.patientId, ctx && ctx.medRecetaByPatient);
  }
}

// Last drug gone = whole proposal dismissed, so the Receta does not offer it again.
export function discardMedProposalItem(monitoreo, key, index) {
  if (!monitoreo || !key || !monitoreo.pendienteReceta) return;
  var pendingItems = parseMedFieldItems(monitoreo.pendienteReceta[key]);
  if (index < 0 || index >= pendingItems.length) return;
  pendingItems.splice(index, 1);
  monitoreo.pendienteReceta[key] = serializeMedFieldItems(pendingItems);
  if (!pendingItems.length) ensureRecetaProposalDismissed(monitoreo)[key] = true;
}

function displayAbxLine(text, activeId, medRecetaByPatient, monitoreo, refDate) {
  var fecha = resolveEaAbxFechaActualizacion(activeId, medRecetaByPatient, monitoreo);
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  return rewriteAbxDisplayText(text, fecha, block && block.items, refDate);
}

function prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate) {
  var ec = monitoreo.estadoClinico || {};
  var pend = monitoreo.pendienteReceta || {};
  var items = parseMedFieldItems(ec[key]);
  var pendingVal = pend[key] != null ? String(pend[key]).trim() : '';
  if (key === 'abx') {
    items = items.map(function (line) {
      return displayAbxLine(line, activeId, medRecetaByPatient, monitoreo, refDate);
    });
    if (pendingVal) {
      pendingVal = displayAbxLine(pendingVal, activeId, medRecetaByPatient, monitoreo, refDate);
    }
  }
  return { items: items, pendingVal: pendingVal };
}

/**
 * @param {string} key
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').emptyMonitoreo>} monitoreo
 * @param {string | null} activeId
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 */
export function medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient, refDate) {
  var block = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate);
  return block.items.length > 0 || block.pendingVal.length > 0;
}

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
export function norepiRateOfLine(line) {
  var m = String(line || '').match(/^\S*(?:NOREPINEFRINA|NORADRENALINA)\S*\s+(\d+(?:[.,]\d+)?)\s*MCG\/MIN\b/i);
  return m ? m[1].replace(',', '.') : '';
}

/** Puts «N MCG/MIN» where the norepinephrine dose was; null if the line is not norepinephrine. */
export function setNorepiRateOnLine(line, rate) {
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
export function medRecetaSelectHtml(key, activeId, medRecetaByPatient) {
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
export function renderMedCategoryGrid(monitoreo, activeId, medRecetaByPatient, revealedKeys, refDate) {
  revealedKeys = Array.isArray(revealedKeys) ? revealedKeys : [];
  return (
    '<div class="ea-clinico-med-grid" data-ea-med-revealed="' + escAttr(JSON.stringify(revealedKeys)) + '">' +
    medGridInnerHtml(monitoreo, activeId, medRecetaByPatient, revealedKeys, refDate) +
    '</div>'
  );
}

// Any change re-renders the whole card: rows are cheap and the counts in the header stay true.
export function refreshMedCategoryBlock(mount, _key, monitoreo, activeId, medRecetaByPatient) {
  var grid = mount && mount.querySelector('.ea-clinico-med-grid');
  if (!grid) return;
  grid.innerHTML = medGridInnerHtml(monitoreo, activeId, medRecetaByPatient, parseRevealedMedKeys(grid));
}

function liveMonitoreoFromCtx(ctx) {
  if (ctx.patient) {
    ensureMonitoreo(ctx.patient);
    return /** @type {Record<string, unknown>} */ (ctx.patient.monitoreo);
  }
  return ctx.monitoreo || {};
}

export function wireMedCategoryGrid(mount, ctx) {
  if (!mount) return;
  var grid = mount.querySelector('.ea-clinico-med-grid');
  if (!grid || grid.dataset.eaMedGridWired === '1') return;
  grid.dataset.eaMedGridWired = '1';

  grid.addEventListener('change', function (ev) {
    var target = /** @type {HTMLElement | null} */ (ev.target);
    if (!target) return;
    if (target.matches('[data-ea-med-pick-category]')) {
      var category = String(/** @type {HTMLSelectElement} */ (target).value);
      if (category) {
        var revealed = parseRevealedMedKeys(grid);
        if (revealed.indexOf(category) < 0) revealed.push(category);
        grid.setAttribute('data-ea-med-revealed', JSON.stringify(revealed));
        refreshMedCategoryBlock(mount, category, liveMonitoreoFromCtx(ctx), ctx.getActiveId(), ctx.medRecetaByPatient);
      }
      return;
    }
    var rateIdx = target.getAttribute('data-ea-vasop-rate');
    if (rateIdx != null) {
      var mon = liveMonitoreoFromCtx(ctx);
      var store = target.getAttribute('data-ea-vasop-src') === 'pending' ? mon.pendienteReceta : mon.estadoClinico;
      var vItems = parseMedFieldItems(store && store.vasop);
      var edited = setNorepiRateOnLine(vItems[Number(rateIdx)], /** @type {HTMLInputElement} */ (target).value);
      if (edited == null) return;
      vItems[Number(rateIdx)] = edited;
      store.vasop = serializeMedFieldItems(vItems);
      ctx.persistClinicalState();
      ctx.syncTextarea();
      refreshMedCategoryBlock(mount, 'vasop', mon, ctx.getActiveId(), ctx.medRecetaByPatient);
      return;
    }
    var addKey = target.getAttribute('data-ea-med-add-select');
    if (!addKey || !('value' in target) || !/** @type {HTMLSelectElement} */ (target).value) return;
    var val = String(/** @type {HTMLSelectElement} */ (target).value);
    var monitoreo = liveMonitoreoFromCtx(ctx);
    addMedFieldItem(monitoreo, addKey, val, {
      activeId: ctx.getActiveId(),
      medRecetaByPatient: ctx.medRecetaByPatient,
    });
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshMedCategoryBlock(mount, addKey, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
  });

  grid.addEventListener('click', function (ev) {
    handleMedGridClick(ev, grid, mount, ctx, liveMonitoreoFromCtx, function (blockMount, key, monitoreo) {
      refreshMedCategoryBlock(blockMount, key, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
    });
  });
}
