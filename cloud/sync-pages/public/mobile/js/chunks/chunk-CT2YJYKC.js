import {
  partitionNmMedLines
} from "/mobile/js/chunks/chunk-5CRK7XGO.js";
import {
  MED_FIELD_KEYS,
  buildMedDropdownOptions,
  classifyMedicationSoapCategory,
  ensureAbxDiaAnchorDate,
  ensureMonitoreo,
  mapSoapDestKeyToEaField,
  resolveEaAbxFechaActualizacion,
  rewriteAbxDisplayText,
  soapDestinationSelectOptionsHtml
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  escAttr,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/estado-actual-med-grid-click.mjs
function handleMedRemoveClick(ev, target, grid, mount, ctx, monitoreo, refreshBlock) {
  const removeBtn = target.closest("[data-ea-med-remove]");
  if (!removeBtn) return false;
  ev.preventDefault();
  ev.stopPropagation();
  const rKey = removeBtn.getAttribute("data-ea-med-remove");
  const idx = Number(removeBtn.getAttribute("data-ea-med-idx"));
  if (rKey && Number.isFinite(idx)) {
    removeMedFieldItem(monitoreo, rKey, idx);
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshBlock(mount, rKey, monitoreo);
  }
  return true;
}
function handleMedToggleClick(target, grid) {
  const toggleBtn = target.closest("[data-ea-med-manual-toggle]");
  if (!toggleBtn) return false;
  const tKey = toggleBtn.getAttribute("data-ea-med-manual-toggle");
  if (!tKey) return true;
  const panel = grid.querySelector('[data-ea-med-manual-panel="' + tKey + '"]');
  if (!panel) return true;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    const input = panel.querySelector('[data-ea-med-manual-input="' + tKey + '"]');
    if (input && "focus" in input) input.focus();
  }
  return true;
}
function handleMedSaveClick(target, grid, mount, ctx, monitoreo, refreshBlock) {
  const saveBtn = target.closest("[data-ea-med-manual-save]");
  if (!saveBtn) return false;
  const sKey = saveBtn.getAttribute("data-ea-med-manual-save");
  if (!sKey) return true;
  const sPanel = grid.querySelector('[data-ea-med-manual-panel="' + sKey + '"]');
  const sInput = sPanel && sPanel.querySelector('[data-ea-med-manual-input="' + sKey + '"]');
  const text = sInput && "value" in sInput ? String(sInput.value).trim() : "";
  if (text) {
    addMedFieldItem(monitoreo, sKey, text, {
      activeId: ctx.getActiveId(),
      medRecetaByPatient: ctx.medRecetaByPatient
    });
    if (sInput && "value" in sInput) sInput.value = "";
    if (sPanel) sPanel.hidden = true;
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshBlock(mount, sKey, monitoreo);
  }
  return true;
}
function handleMedCancelClick(target, grid) {
  const cancelBtn = target.closest("[data-ea-med-manual-cancel]");
  if (!cancelBtn) return false;
  const cKey = cancelBtn.getAttribute("data-ea-med-manual-cancel");
  if (!cKey) return true;
  const cPanel = grid.querySelector('[data-ea-med-manual-panel="' + cKey + '"]');
  const cInput = cPanel && cPanel.querySelector('[data-ea-med-manual-input="' + cKey + '"]');
  if (cInput && "value" in cInput) cInput.value = "";
  if (cPanel) cPanel.hidden = true;
  return true;
}
function handleMedGridClick(ev, grid, mount, ctx, liveMonitoreoFromCtx2, refreshBlock) {
  const target = (
    /** @type {HTMLElement | null} */
    ev.target
  );
  if (!target || !grid.contains(target)) return false;
  const monitoreo = liveMonitoreoFromCtx2(ctx);
  if (handleMedRemoveClick(ev, target, grid, mount, ctx, monitoreo, refreshBlock)) return true;
  if (handleMedToggleClick(target, grid)) return true;
  if (handleMedSaveClick(target, grid, mount, ctx, monitoreo, refreshBlock)) return true;
  if (handleMedCancelClick(target, grid)) return true;
  return false;
}

// public/js/features/estado-actual-med-ui.mjs
var EA_MED_FIELD_LABELS = {
  analgesia: "Analg\xE9sicos / antipir\xE9ticos",
  antiemeticos: "Antiem\xE9ticos",
  sedacion: "Sedaci\xF3n / delirium",
  antiepilepticos: "Antiepil\xE9pticos",
  antiparkinsonianos: "Antiparkinsonianos",
  antidotos: "Ant\xEDdotos",
  viaAerea: "V\xEDa a\xE9rea",
  abx: "Antibi\xF3ticos",
  transfusiones: "Transfusiones",
  antihta: "Antihipertensivos",
  diureticos: "Diur\xE9ticos",
  antitromboticos: "Tromboprofilaxis",
  anticoagulacion: "Anticoagulaci\xF3n",
  antiarritmicos: "Antiarr\xEDtmicos",
  estatinas: "Estatinas",
  vasop: "Vasopresores",
  nm: "NM (soporte, cr\xF3nicos, etc.)"
};
function parseMedFieldItems(raw) {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw).split(" | ").map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function serializeMedFieldItems(items) {
  return (items || []).map(function(s) {
    return String(s).trim();
  }).filter(Boolean).join(" | ");
}
function addMedFieldItem(monitoreo, key, text, ctx) {
  if (!monitoreo || !key || !text || !String(text).trim()) return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== "object") {
    monitoreo.estadoClinico = {};
  }
  var items = parseMedFieldItems(
    /** @type {Record<string, unknown>} */
    monitoreo.estadoClinico[key]
  );
  var next = String(text).trim();
  if (items.indexOf(next) === -1) items.push(next);
  monitoreo.estadoClinico[key] = serializeMedFieldItems(items);
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") monitoreo.confirmado = {};
  monitoreo.confirmado[key] = true;
  if (key === "abx") {
    ensureAbxDiaAnchorDate(monitoreo, ctx && ctx.activeId, ctx && ctx.medRecetaByPatient);
  }
  if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object") {
    monitoreo.pendienteReceta[key] = "";
  }
}
function removeMedFieldItem(monitoreo, key, index) {
  if (!monitoreo || !monitoreo.estadoClinico) return;
  var items = parseMedFieldItems(monitoreo.estadoClinico[key]);
  if (index < 0 || index >= items.length) return;
  items.splice(index, 1);
  monitoreo.estadoClinico[key] = serializeMedFieldItems(items);
  if (!monitoreo.confirmado) monitoreo.confirmado = {};
  monitoreo.confirmado[key] = items.length > 0;
}
function medCatPreviewText(items) {
  if (!items.length) return "";
  var first = items[0];
  var short = first.length > 52 ? first.slice(0, 49) + "\u2026" : first;
  if (items.length === 1) return short;
  return short + " (+" + (items.length - 1) + ")";
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
  var pendingVal = pend[key] != null ? String(pend[key]).trim() : "";
  if (key === "abx") {
    items = items.map(function(line) {
      return displayAbxLine(line, activeId, medRecetaByPatient, monitoreo, refDate);
    });
    if (pendingVal) {
      pendingVal = displayAbxLine(pendingVal, activeId, medRecetaByPatient, monitoreo, refDate);
    }
  }
  return { items, pendingVal };
}
function medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient, refDate) {
  var block = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate);
  return block.items.length > 0 || block.pendingVal.length > 0;
}
function medCategoryBadgeHtml(pendingVal, monitoreo, key, items) {
  if (pendingVal) return '<span class="ea-pendiente-badge">Propuesta</span>';
  if (monitoreo.confirmado && monitoreo.confirmado[key] && items.length) {
    return '<span class="ea-confirmed-badge">Confirmado</span>';
  }
  return "";
}
function medSelectOptionsHtml(key, options) {
  return '<option value="">+ Desde receta\u2026</option>' + options.map(function(opt) {
    return '<option value="' + escAttr(opt.value) + '">' + escHtml(opt.label) + "</option>";
  }).join("");
}
function medItemRowHtml(item, key, idx) {
  return '<div class="ea-med-item"><div class="ea-med-item-row"><span class="ea-med-item-text">' + escHtml(item) + '</span><button type="button" class="ea-btn ea-btn--icon ea-med-item-remove" data-ea-med-remove="' + escAttr(key) + '" data-ea-med-idx="' + idx + '" aria-label="Quitar medicamento">\xD7</button></div></div>';
}
function medItemsListHtml(items, key) {
  return items.map(function(item, idx) {
    return medItemRowHtml(item, key, idx);
  }).join("");
}
function medItemsListHtmlWithIndices(items, key, indices) {
  return items.map(function(item, displayIdx) {
    return medItemRowHtml(item, key, indices[displayIdx]);
  }).join("");
}
function renderNmAntidiabeticSubsectionHtml(key, items) {
  var part = partitionNmMedLines(items);
  if (!part.antidiabeticos.length) return "";
  var itemsHtml = medItemsListHtmlWithIndices(part.antidiabeticos, key, part.antidiabeticIndices);
  return '<details class="ea-med-subcat ea-med-subcat--antidiabeticos" open><summary class="ea-med-subcat-summary"><span class="ea-med-subcat-title">Antidiab\xE9ticos</span><span class="ea-med-subcat-preview ea-muted">' + escHtml(medCatPreviewText(part.antidiabeticos)) + '</span></summary><div class="ea-med-subcat-body"><div class="ea-med-item-list">' + itemsHtml + "</div></div></details>";
}
function renderNmMedItemsBodyHtml(key, items) {
  var part = partitionNmMedLines(items);
  var antidiabeticHtml = renderNmAntidiabeticSubsectionHtml(key, items);
  var otherHtml = part.other.length ? '<div class="ea-med-item-list">' + medItemsListHtmlWithIndices(part.other, key, part.otherIndices) + "</div>" : "";
  return antidiabeticHtml + otherHtml;
}
function medMoveTargetOptionsHtml(fromKey) {
  return soapDestinationSelectOptionsHtml(escHtml, {
    omitEmpty: true,
    excludeKey: fromKey,
    mapKey: mapSoapDestKeyToEaField,
    labels: EA_MED_FIELD_LABELS
  });
}
function medPendingBlockHtml(key, pendingVal) {
  if (!pendingVal) return "";
  return '<div class="ea-med-pending"><div class="ea-pendiente-preview" title="Propuesta pendiente">' + escHtml(pendingVal) + `</div><div class="ea-clinico-med-actions"><button type="button" class="ea-btn ea-btn--success" onclick="confirmEaMedField('` + key + `')">Confirmar</button><button type="button" class="ea-btn ea-btn--ghost" onclick="discardEaMedProposal('` + key + `')">Descartar</button><button type="button" class="ea-btn ea-btn--ghost" onclick="toggleEaMedReclassifyPanel('` + key + `')" title="Corregir clasificaci\xF3n SOAP del medicamento">Reclasificar categor\xEDa</button></div><div class="ea-med-reclassify-panel" hidden data-ea-med-reclassify-panel="` + escAttr(key) + '"><span class="ea-med-reclassify-label">Categor\xEDa destino (SOAP)</span><div class="ea-med-reclassify-controls"><select class="ea-input ea-med-reclassify-select" data-ea-med-reclassify-select="' + escAttr(key) + '"><option value="">Seleccionar categor\xEDa\u2026</option>' + medMoveTargetOptionsHtml(key) + `</select><button type="button" class="ea-btn ea-btn--ghost" onclick="applyEaMedReclassification('` + key + `')">Aplicar reclasificaci\xF3n</button></div></div></div>`;
}
function medManualPanelHtml(key) {
  return '<div class="ea-med-manual-panel" hidden data-ea-med-manual-panel="' + escAttr(key) + '"><input type="text" class="ea-input" data-ea-med-manual-input="' + escAttr(key) + '" placeholder="Indicaci\xF3n manual"><div class="ea-med-manual-actions"><button type="button" class="ea-btn ea-btn--success" data-ea-med-manual-save="' + escAttr(key) + '">A\xF1adir</button><button type="button" class="ea-btn ea-btn--ghost" data-ea-med-manual-cancel="' + escAttr(key) + '">Cancelar</button></div></div>';
}
function renderMedCategoryPickOptions(keys) {
  if (!keys.length) {
    return '<option value="">Todas las categor\xEDas visibles</option>';
  }
  return '<option value="">Tipo de medicamento\u2026</option>' + soapDestinationSelectOptionsHtml(escHtml, {
    omitEmpty: true,
    includeKeys: keys,
    mapKey: mapSoapDestKeyToEaField,
    labels: EA_MED_FIELD_LABELS
  });
}
function renderMedCategoryAddBar(hiddenKeys) {
  var disabled = hiddenKeys.length === 0;
  return '<div class="ea-med-add-category-row"><span class="ea-med-add-category-label">A\xF1adir medicamento</span><div class="ea-med-add-category-controls"><select class="ea-input ea-med-pick-category" data-ea-med-pick-category"' + (disabled ? " disabled" : "") + ">" + renderMedCategoryPickOptions(hiddenKeys) + '</select><button type="button" class="ea-btn ea-btn--ghost ea-med-reveal-category" data-ea-med-reveal-category' + (disabled ? " disabled" : "") + ">+ A\xF1adir categor\xEDa</button></div></div>";
}
function parseRevealedMedKeys(grid) {
  if (!grid) return [];
  var raw = grid.getAttribute("data-ea-med-revealed");
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}
function getShownMedCategoryKeys(grid) {
  if (!grid) return [];
  return Array.prototype.map.call(grid.querySelectorAll("[data-ea-med-cat]"), function(el) {
    return el.getAttribute("data-ea-med-cat");
  }).filter(Boolean);
}
function syncMedCategoryAddBar(grid) {
  if (!grid) return;
  var addBar = grid.querySelector(".ea-med-add-category-row");
  if (!addBar) return;
  var shown = getShownMedCategoryKeys(grid);
  var hidden = MED_FIELD_KEYS.filter(function(key) {
    return shown.indexOf(key) < 0;
  });
  var select = addBar.querySelector("[data-ea-med-pick-category]");
  var btn = addBar.querySelector("[data-ea-med-reveal-category]");
  if (select) {
    select.innerHTML = renderMedCategoryPickOptions(hidden);
    select.disabled = hidden.length === 0;
    select.value = "";
  }
  if (btn) btn.disabled = hidden.length === 0;
}
function revealMedCategoryKey(mount, grid, key, ctx) {
  if (!grid || !key) return;
  var revealed = parseRevealedMedKeys(grid);
  if (revealed.indexOf(key) < 0) revealed.push(key);
  grid.setAttribute("data-ea-med-revealed", JSON.stringify(revealed));
  var monitoreo = liveMonitoreoFromCtx(ctx);
  if (!grid.querySelector('[data-ea-med-cat="' + key + '"]')) {
    var addBar = grid.querySelector(".ea-med-add-category-row");
    var html = renderMedCategoryBlock(key, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient, { forceOpen: true });
    if (addBar) addBar.insertAdjacentHTML("beforebegin", html);
    else grid.insertAdjacentHTML("beforeend", html);
  }
  var det = grid.querySelector('[data-ea-med-cat="' + key + '"]');
  if (det && "open" in det) det.open = true;
  syncMedCategoryAddBar(grid);
}
function renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, opts) {
  opts = opts || {};
  var refDate = opts.refDate;
  var block = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate);
  var items = block.items;
  var pendingVal = block.pendingVal;
  var label = EA_MED_FIELD_LABELS[key] || key;
  var options = buildMedDropdownOptions(
    activeId,
    key,
    medRecetaByPatient,
    classifyMedicationSoapCategory,
    refDate
  );
  var itemsHtml = key === "nm" ? renderNmMedItemsBodyHtml(key, items) : medItemsListHtml(items, key);
  var openAttr = items.length || pendingVal || opts.forceOpen ? " open" : "";
  var previewText = medCatPreviewText(items);
  return '<details class="ea-med-cat" data-ea-med-cat="' + escAttr(key) + '"' + openAttr + '><summary class="ea-med-cat-summary"><span class="ea-med-cat-title">' + escHtml(label) + "</span>" + (previewText ? '<span class="ea-med-cat-preview ea-muted">' + escHtml(previewText) + "</span>" : "") + medCategoryBadgeHtml(pendingVal, monitoreo, key, items) + '</summary><div class="ea-med-cat-body">' + medPendingBlockHtml(key, pendingVal) + (itemsHtml ? key === "nm" ? itemsHtml : '<div class="ea-med-item-list">' + itemsHtml + "</div>" : "") + '<div class="ea-med-add-row"><select class="ea-input ea-med-add-select" data-ea-med-add-select="' + escAttr(key) + '">' + medSelectOptionsHtml(key, options) + '</select><button type="button" class="ea-btn ea-btn--ghost ea-med-manual-toggle" data-ea-med-manual-toggle="' + escAttr(key) + '">+ Manual</button></div>' + medManualPanelHtml(key) + "</div></details>";
}
function renderMedCategoryGrid(monitoreo, activeId, medRecetaByPatient, revealedKeys, refDate) {
  revealedKeys = Array.isArray(revealedKeys) ? revealedKeys : [];
  var shownKeys = MED_FIELD_KEYS.filter(function(key) {
    return medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient, refDate) || revealedKeys.indexOf(key) >= 0;
  });
  var blocks = shownKeys.map(function(key) {
    var forceOpen = revealedKeys.indexOf(key) >= 0 && !medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient, refDate);
    return renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, {
      forceOpen,
      refDate
    });
  }).join("");
  var hiddenKeys = MED_FIELD_KEYS.filter(function(key) {
    return shownKeys.indexOf(key) < 0;
  });
  return '<div class="ea-clinico-med-grid" data-ea-med-revealed="' + escAttr(JSON.stringify(revealedKeys)) + '">' + blocks + renderMedCategoryAddBar(hiddenKeys) + "</div>";
}
function refreshMedCategoryBlock(mount, key, monitoreo, activeId, medRecetaByPatient) {
  if (!mount || !key) return;
  var grid = mount.querySelector(".ea-clinico-med-grid");
  if (!grid) return;
  var existing = grid.querySelector('[data-ea-med-cat="' + key + '"]');
  var hasContent = medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient);
  var revealed = parseRevealedMedKeys(grid);
  var isRevealed = revealed.indexOf(key) >= 0;
  if (!hasContent && !isRevealed) {
    if (existing) existing.remove();
    syncMedCategoryAddBar(grid);
    return;
  }
  var html = renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, {
    forceOpen: isRevealed && !hasContent
  });
  if (existing) {
    var wasOpen = existing.open;
    existing.outerHTML = html;
    var next = grid.querySelector('[data-ea-med-cat="' + key + '"]');
    if (next && (wasOpen || hasContent || isRevealed)) next.open = true;
  }
  syncMedCategoryAddBar(grid);
}
function liveMonitoreoFromCtx(ctx) {
  if (ctx.patient) {
    ensureMonitoreo(ctx.patient);
    return (
      /** @type {Record<string, unknown>} */
      ctx.patient.monitoreo
    );
  }
  return ctx.monitoreo || {};
}
function wireMedCategoryGrid(mount, ctx) {
  if (!mount) return;
  var grid = mount.querySelector(".ea-clinico-med-grid");
  if (!grid || grid.dataset.eaMedGridWired === "1") return;
  grid.dataset.eaMedGridWired = "1";
  grid.addEventListener("change", function(ev) {
    var target = (
      /** @type {HTMLElement | null} */
      ev.target
    );
    if (!target) return;
    var addKey = target.getAttribute("data-ea-med-add-select");
    if (!addKey || !("value" in target) || !/** @type {HTMLSelectElement} */
    target.value) return;
    var val = String(
      /** @type {HTMLSelectElement} */
      target.value
    );
    var monitoreo = liveMonitoreoFromCtx(ctx);
    addMedFieldItem(monitoreo, addKey, val, {
      activeId: ctx.getActiveId(),
      medRecetaByPatient: ctx.medRecetaByPatient
    });
    target.value = "";
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshMedCategoryBlock(mount, addKey, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
  });
  grid.addEventListener("click", function(ev) {
    var target = (
      /** @type {HTMLElement | null} */
      ev.target
    );
    if (!target || !grid.contains(target)) return;
    if (target.closest("[data-ea-med-reveal-category]")) {
      ev.preventDefault();
      var pick = grid.querySelector("[data-ea-med-pick-category]");
      if (!pick || !("value" in pick) || !/** @type {HTMLSelectElement} */
      pick.value) return;
      var category = String(
        /** @type {HTMLSelectElement} */
        pick.value
      );
      revealMedCategoryKey(mount, grid, category, ctx);
      pick.value = "";
      return;
    }
    handleMedGridClick(ev, grid, mount, ctx, liveMonitoreoFromCtx, function(blockMount, key, monitoreo) {
      refreshMedCategoryBlock(blockMount, key, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
    });
  });
}

export {
  EA_MED_FIELD_LABELS,
  parseMedFieldItems,
  renderMedCategoryGrid,
  wireMedCategoryGrid
};
//# sourceMappingURL=/js/chunks/chunk-CT2YJYKC.js.map
