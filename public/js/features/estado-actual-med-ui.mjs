import { MED_FIELD_KEYS, ensureMonitoreo } from './estado-actual-data.mjs';
import { buildMedDropdownOptions, resolveEaAbxFechaActualizacion, ensureAbxDiaAnchorDate } from './estado-actual-meds.mjs';
import { handleMedGridClick } from './estado-actual-med-grid-click.mjs';
import { advanceAbxMedTextForManejoDate, classifyMedicationSoapCategory } from '../med-receta-core.mjs';
import { partitionNmMedLines } from '../nm-antidiabetic-detect.mjs';

/** @type {Record<string, string>} */
export const EA_MED_FIELD_LABELS = {
  analgesia: 'Analgesia',
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
  nm: 'NM (soporte, crónicos, etc.)',
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

export function addMedFieldItem(monitoreo, key, text, ctx) {
  if (!monitoreo || !key || !text || !String(text).trim()) return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  var items = parseMedFieldItems(/** @type {Record<string, unknown>} */ (monitoreo.estadoClinico)[key]);
  var next = String(text).trim();
  if (items.indexOf(next) === -1) items.push(next);
  /** @type {Record<string, string>} */ (monitoreo.estadoClinico)[key] = serializeMedFieldItems(items);
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') monitoreo.confirmado = {};
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
  items.splice(index, 1);
  monitoreo.estadoClinico[key] = serializeMedFieldItems(items);
  if (!monitoreo.confirmado) monitoreo.confirmado = {};
  monitoreo.confirmado[key] = items.length > 0;
}

function medCatPreviewText(items) {
  if (!items.length) return '';
  var first = items[0];
  var short = first.length > 52 ? first.slice(0, 49) + '…' : first;
  if (items.length === 1) return short;
  return short + ' (+' + (items.length - 1) + ')';
}

function displayAbxLine(text, activeId, medRecetaByPatient, monitoreo) {
  var fecha = resolveEaAbxFechaActualizacion(activeId, medRecetaByPatient, monitoreo);
  if (!fecha || !text) return text;
  return advanceAbxMedTextForManejoDate(String(text), fecha);
}

function prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient) {
  var ec = monitoreo.estadoClinico || {};
  var pend = monitoreo.pendienteReceta || {};
  var items = parseMedFieldItems(ec[key]);
  var pendingVal = pend[key] != null ? String(pend[key]).trim() : '';
  if (key === 'abx') {
    items = items.map(function (line) {
      return displayAbxLine(line, activeId, medRecetaByPatient, monitoreo);
    });
    if (pendingVal) pendingVal = displayAbxLine(pendingVal, activeId, medRecetaByPatient, monitoreo);
  }
  return { items: items, pendingVal: pendingVal };
}

/**
 * @param {string} key
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').emptyMonitoreo>} monitoreo
 * @param {string | null} activeId
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 */
export function medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient) {
  var block = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient);
  return block.items.length > 0 || block.pendingVal.length > 0;
}

function medCategoryBadgeHtml(pendingVal, monitoreo, key, items) {
  if (pendingVal) return '<span class="ea-pendiente-badge">Propuesta</span>';
  if (monitoreo.confirmado && monitoreo.confirmado[key] && items.length) {
    return '<span class="ea-confirmed-badge">Confirmado</span>';
  }
  return '';
}

function medSelectOptionsHtml(key, options) {
  return (
    '<option value="">+ Desde receta…</option>' +
    options
      .map(function (opt) {
        return '<option value="' + escAttr(opt.value) + '">' + escHtml(opt.label) + '</option>';
      })
      .join('')
  );
}

function medItemRowHtml(item, key, idx) {
  return (
    '<div class="ea-med-item">' +
    '<div class="ea-med-item-row">' +
    '<span class="ea-med-item-text">' +
    escHtml(item) +
    '</span>' +
    '<button type="button" class="ea-btn ea-btn--icon ea-med-item-remove" data-ea-med-remove="' +
    escAttr(key) +
    '" data-ea-med-idx="' +
    idx +
    '" aria-label="Quitar medicamento">×</button>' +
    '</div></div>'
  );
}

function medItemsListHtml(items, key) {
  return items
    .map(function (item, idx) {
      return medItemRowHtml(item, key, idx);
    })
    .join('');
}

function medItemsListHtmlWithIndices(items, key, indices) {
  return items
    .map(function (item, displayIdx) {
      return medItemRowHtml(item, key, indices[displayIdx]);
    })
    .join('');
}

function renderNmAntidiabeticSubsectionHtml(key, items) {
  var part = partitionNmMedLines(items);
  if (!part.antidiabeticos.length) return '';
  var itemsHtml = medItemsListHtmlWithIndices(part.antidiabeticos, key, part.antidiabeticIndices);
  return (
    '<details class="ea-med-subcat ea-med-subcat--antidiabeticos" open>' +
    '<summary class="ea-med-subcat-summary">' +
    '<span class="ea-med-subcat-title">Antidiabéticos</span>' +
    '<span class="ea-med-subcat-preview ea-muted">' +
    escHtml(medCatPreviewText(part.antidiabeticos)) +
    '</span>' +
    '</summary>' +
    '<div class="ea-med-subcat-body">' +
    '<div class="ea-med-item-list">' +
    itemsHtml +
    '</div></div></details>'
  );
}

function renderNmMedItemsBodyHtml(key, items) {
  var part = partitionNmMedLines(items);
  var antidiabeticHtml = renderNmAntidiabeticSubsectionHtml(key, items);
  var otherHtml = part.other.length
    ? '<div class="ea-med-item-list">' + medItemsListHtmlWithIndices(part.other, key, part.otherIndices) + '</div>'
    : '';
  return antidiabeticHtml + otherHtml;
}

function medMoveTargetOptionsHtml(fromKey) {
  return MED_FIELD_KEYS.filter(function (k) {
    return k !== fromKey;
  })
    .map(function (k) {
      return (
        '<option value="' +
        escAttr(k) +
        '">' +
        escHtml(EA_MED_FIELD_LABELS[k] || k) +
        '</option>'
      );
    })
    .join('');
}

function medPendingBlockHtml(key, pendingVal) {
  if (!pendingVal) return '';
  return (
    '<div class="ea-med-pending">' +
    '<div class="ea-pendiente-preview" title="Propuesta pendiente">' +
    escHtml(pendingVal) +
    '</div>' +
    '<div class="ea-clinico-med-actions">' +
    '<button type="button" class="ea-btn ea-btn--success" onclick="confirmEaMedField(\'' +
    key +
    '\')">Confirmar</button>' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="discardEaMedProposal(\'' +
    key +
    '\')">Descartar</button>' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="toggleEaMedReclassifyPanel(\'' +
    key +
    '\')" title="Corregir clasificación SOAP del medicamento">Reclasificar categoría</button>' +
    '</div>' +
    '<div class="ea-med-reclassify-panel" hidden data-ea-med-reclassify-panel="' +
    escAttr(key) +
    '">' +
    '<span class="ea-med-reclassify-label">Categoría destino (SOAP)</span>' +
    '<div class="ea-med-reclassify-controls">' +
    '<select class="ea-input ea-med-reclassify-select" data-ea-med-reclassify-select="' +
    escAttr(key) +
    '">' +
    '<option value="">Seleccionar categoría…</option>' +
    medMoveTargetOptionsHtml(key) +
    '</select>' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="applyEaMedReclassification(\'' +
    key +
    '\')">Aplicar reclasificación</button>' +
    '</div></div></div>'
  );
}

function medManualPanelHtml(key) {
  return (
    '<div class="ea-med-manual-panel" hidden data-ea-med-manual-panel="' +
    escAttr(key) +
    '">' +
    '<input type="text" class="ea-input" data-ea-med-manual-input="' +
    escAttr(key) +
    '" placeholder="Indicación manual">' +
    '<div class="ea-med-manual-actions">' +
    '<button type="button" class="ea-btn ea-btn--success" data-ea-med-manual-save="' +
    escAttr(key) +
    '">Añadir</button>' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-ea-med-manual-cancel="' +
    escAttr(key) +
    '">Cancelar</button>' +
    '</div></div>'
  );
}

function renderMedCategoryPickOptions(keys) {
  if (!keys.length) {
    return '<option value="">Todas las categorías visibles</option>';
  }
  return (
    '<option value="">Tipo de medicamento…</option>' +
    keys
      .map(function (key) {
        return (
          '<option value="' +
          escAttr(key) +
          '">' +
          escHtml(EA_MED_FIELD_LABELS[key] || key) +
          '</option>'
        );
      })
      .join('')
  );
}

function renderMedCategoryAddBar(hiddenKeys) {
  var disabled = hiddenKeys.length === 0;
  return (
    '<div class="ea-med-add-category-row">' +
    '<span class="ea-med-add-category-label">Añadir medicamento</span>' +
    '<div class="ea-med-add-category-controls">' +
    '<select class="ea-input ea-med-pick-category" data-ea-med-pick-category"' +
    (disabled ? ' disabled' : '') +
    '>' +
    renderMedCategoryPickOptions(hiddenKeys) +
    '</select>' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-med-reveal-category" data-ea-med-reveal-category' +
    (disabled ? ' disabled' : '') +
    '>+ Añadir categoría</button>' +
    '</div></div>'
  );
}

function parseRevealedMedKeys(grid) {
  if (!grid) return [];
  var raw = grid.getAttribute('data-ea-med-revealed');
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (_e) {
    return [];
  }
}

function getShownMedCategoryKeys(grid) {
  if (!grid) return [];
  return Array.prototype.map.call(grid.querySelectorAll('[data-ea-med-cat]'), function (el) {
    return el.getAttribute('data-ea-med-cat');
  }).filter(Boolean);
}

function syncMedCategoryAddBar(grid, monitoreo, activeId, medRecetaByPatient) {
  if (!grid) return;
  var addBar = grid.querySelector('.ea-med-add-category-row');
  if (!addBar) return;
  var shown = getShownMedCategoryKeys(grid);
  var hidden = MED_FIELD_KEYS.filter(function (key) {
    return shown.indexOf(key) < 0;
  });
  var select = addBar.querySelector('[data-ea-med-pick-category]');
  var btn = addBar.querySelector('[data-ea-med-reveal-category]');
  if (select) {
    select.innerHTML = renderMedCategoryPickOptions(hidden);
    select.disabled = hidden.length === 0;
    select.value = '';
  }
  if (btn) btn.disabled = hidden.length === 0;
}

function revealMedCategoryKey(mount, grid, key, ctx) {
  if (!grid || !key) return;
  var revealed = parseRevealedMedKeys(grid);
  if (revealed.indexOf(key) < 0) revealed.push(key);
  grid.setAttribute('data-ea-med-revealed', JSON.stringify(revealed));
  var monitoreo = liveMonitoreoFromCtx(ctx);
  if (!grid.querySelector('[data-ea-med-cat="' + key + '"]')) {
    var addBar = grid.querySelector('.ea-med-add-category-row');
    var html = renderMedCategoryBlock(key, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient, { forceOpen: true });
    if (addBar) addBar.insertAdjacentHTML('beforebegin', html);
    else grid.insertAdjacentHTML('beforeend', html);
  }
  var det = grid.querySelector('[data-ea-med-cat="' + key + '"]');
  if (det && 'open' in det) det.open = true;
  syncMedCategoryAddBar(grid, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
}

export function renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, opts) {
  opts = opts || {};
  var block = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient);
  var items = block.items;
  var pendingVal = block.pendingVal;
  var label = EA_MED_FIELD_LABELS[key] || key;
  var options = buildMedDropdownOptions(activeId, key, medRecetaByPatient, classifyMedicationSoapCategory);
  var itemsHtml =
    key === 'nm' ? renderNmMedItemsBodyHtml(key, items) : medItemsListHtml(items, key);
  var openAttr = items.length || pendingVal || opts.forceOpen ? ' open' : '';
  var previewText = medCatPreviewText(items);

  return (
    '<details class="ea-med-cat" data-ea-med-cat="' +
    escAttr(key) +
    '"' +
    openAttr +
    '>' +
    '<summary class="ea-med-cat-summary">' +
    '<span class="ea-med-cat-title">' +
    escHtml(label) +
    '</span>' +
    (previewText
      ? '<span class="ea-med-cat-preview ea-muted">' + escHtml(previewText) + '</span>'
      : '') +
    medCategoryBadgeHtml(pendingVal, monitoreo, key, items) +
    '</summary>' +
    '<div class="ea-med-cat-body">' +
    medPendingBlockHtml(key, pendingVal) +
    (itemsHtml ? (key === 'nm' ? itemsHtml : '<div class="ea-med-item-list">' + itemsHtml + '</div>') : '') +
    '<div class="ea-med-add-row">' +
    '<select class="ea-input ea-med-add-select" data-ea-med-add-select="' +
    escAttr(key) +
    '">' +
    medSelectOptionsHtml(key, options) +
    '</select>' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-med-manual-toggle" data-ea-med-manual-toggle="' +
    escAttr(key) +
    '">+ Manual</button>' +
    '</div>' +
    medManualPanelHtml(key) +
    '</div></details>'
  );
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').emptyMonitoreo>} monitoreo
 * @param {string | null} activeId
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 * @param {string[]} [revealedKeys]
 * @returns {string}
 */
export function renderMedCategoryGrid(monitoreo, activeId, medRecetaByPatient, revealedKeys) {
  revealedKeys = Array.isArray(revealedKeys) ? revealedKeys : [];
  var shownKeys = MED_FIELD_KEYS.filter(function (key) {
    return medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient) || revealedKeys.indexOf(key) >= 0;
  });
  var blocks = shownKeys
    .map(function (key) {
      var forceOpen =
        revealedKeys.indexOf(key) >= 0 && !medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient);
      return renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, { forceOpen: forceOpen });
    })
    .join('');
  var hiddenKeys = MED_FIELD_KEYS.filter(function (key) {
    return shownKeys.indexOf(key) < 0;
  });
  return (
    '<div class="ea-clinico-med-grid" data-ea-med-revealed="' +
    escAttr(JSON.stringify(revealedKeys)) +
    '">' +
    blocks +
    renderMedCategoryAddBar(hiddenKeys) +
    '</div>'
  );
}

export function refreshMedCategoryBlock(mount, key, monitoreo, activeId, medRecetaByPatient) {
  if (!mount || !key) return;
  var grid = mount.querySelector('.ea-clinico-med-grid');
  if (!grid) return;
  var existing = grid.querySelector('[data-ea-med-cat="' + key + '"]');
  var hasContent = medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient);
  var revealed = parseRevealedMedKeys(grid);
  var isRevealed = revealed.indexOf(key) >= 0;
  if (!hasContent && !isRevealed) {
    if (existing) existing.remove();
    syncMedCategoryAddBar(grid, monitoreo, activeId, medRecetaByPatient);
    return;
  }
  var html = renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, {
    forceOpen: isRevealed && !hasContent,
  });
  if (existing) {
    var wasOpen = existing.open;
    existing.outerHTML = html;
    var next = grid.querySelector('[data-ea-med-cat="' + key + '"]');
    if (next && (wasOpen || hasContent || isRevealed)) next.open = true;
  }
  syncMedCategoryAddBar(grid, monitoreo, activeId, medRecetaByPatient);
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
    var addKey = target.getAttribute('data-ea-med-add-select');
    if (!addKey || !('value' in target) || !/** @type {HTMLSelectElement} */ (target).value) return;
    var val = String(/** @type {HTMLSelectElement} */ (target).value);
    var monitoreo = liveMonitoreoFromCtx(ctx);
    addMedFieldItem(monitoreo, addKey, val, {
      activeId: ctx.getActiveId(),
      medRecetaByPatient: ctx.medRecetaByPatient,
    });
    /** @type {HTMLSelectElement} */ (target).value = '';
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshMedCategoryBlock(mount, addKey, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
  });

  grid.addEventListener('click', function (ev) {
    var target = /** @type {HTMLElement | null} */ (ev.target);
    if (!target || !grid.contains(target)) return;
    if (target.closest('[data-ea-med-reveal-category]')) {
      ev.preventDefault();
      var pick = grid.querySelector('[data-ea-med-pick-category]');
      if (!pick || !('value' in pick) || !/** @type {HTMLSelectElement} */ (pick).value) return;
      var category = String(/** @type {HTMLSelectElement} */ (pick).value);
      revealMedCategoryKey(mount, grid, category, ctx);
      /** @type {HTMLSelectElement} */ (pick).value = '';
      return;
    }
    handleMedGridClick(ev, grid, mount, ctx, liveMonitoreoFromCtx, function (blockMount, key, monitoreo) {
      refreshMedCategoryBlock(blockMount, key, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
    });
  });
}
